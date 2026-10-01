import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { apply, court, type Action } from "./store";
import type { Club, Session, SessionState } from "./types";

// Override with DATA_DIR in .env.local to store data somewhere else (a
// mounted volume in a container, a separate dir per facility, etc).
// Relative paths resolve against the project root; absolute paths are used
// as-is.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), ".data");
const CLUBS_FILE = path.join(DATA_DIR, "clubs.json");
const SESSIONS_DIR = path.join(DATA_DIR, "club-sessions");
const LEGACY_SESSION_FILE = path.join(DATA_DIR, "session.json");

const sessionsFile = (clubId: string) => path.join(SESSIONS_DIR, `${clubId}.json`);

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Serializes every club/session read-modify-write so concurrent requests
 * can't clobber each other, the same way the old single-session store did.
 */
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

/**
 * One-time, best-effort import of the pre-clubs single session file (if any
 * exists and no club has been created yet) into a new default club, so
 * existing data isn't orphaned by this feature. Runs at most once per
 * server process.
 */
let migrateAttempted = false;
async function migrateLegacySession(): Promise<void> {
  if (migrateAttempted) return;
  migrateAttempted = true;

  const clubs = await readJson<Club[]>(CLUBS_FILE, []);
  if (clubs.length > 0) return; // already set up

  let legacy: Partial<SessionState> | null = null;
  try {
    legacy = JSON.parse(await fs.readFile(LEGACY_SESSION_FILE, "utf8"));
  } catch {
    return; // nothing to migrate
  }
  if (!legacy || !Array.isArray(legacy.players)) return;

  const club: Club = { id: randomUUID(), name: "My Club", createdAt: Date.now() };
  const session: Session = {
    id: randomUUID(),
    clubId: club.id,
    endedAt: null,
    label: legacy.label ?? "",
    startedAt: legacy.startedAt ?? Date.now(),
    players: legacy.players ?? [],
    courts: legacy.courts ?? [],
    queue: legacy.queue ?? [],
    history: legacy.history ?? [],
    settings: legacy.settings ?? { gameMode: "doubles", winnersStay: true },
  };
  await writeJson(CLUBS_FILE, [club]);
  await writeJson(sessionsFile(club.id), [session]);
}

// --- clubs -------------------------------------------------------------

export function listClubs(): Promise<Club[]> {
  return withLock(async () => {
    await migrateLegacySession();
    const clubs = await readJson<Club[]>(CLUBS_FILE, []);
    return [...clubs].sort((a, b) => a.name.localeCompare(b.name));
  });
}

export function getClub(id: string): Promise<Club | undefined> {
  return withLock(async () => {
    await migrateLegacySession();
    const clubs = await readJson<Club[]>(CLUBS_FILE, []);
    return clubs.find((c) => c.id === id);
  });
}

export function createClub(name: string): Promise<Club> {
  return withLock(async () => {
    await migrateLegacySession();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("A club needs a name.");
    const clubs = await readJson<Club[]>(CLUBS_FILE, []);
    const club: Club = { id: randomUUID(), name: trimmed, createdAt: Date.now() };
    clubs.push(club);
    await writeJson(CLUBS_FILE, clubs);
    await writeJson(sessionsFile(club.id), []);
    return club;
  });
}

export function renameClub(id: string, name: string): Promise<Club> {
  return withLock(async () => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("A club needs a name.");
    const clubs = await readJson<Club[]>(CLUBS_FILE, []);
    const club = clubs.find((c) => c.id === id);
    if (!club) throw new Error("That club no longer exists.");
    club.name = trimmed;
    await writeJson(CLUBS_FILE, clubs);
    return club;
  });
}

export function deleteClub(id: string): Promise<void> {
  return withLock(async () => {
    const clubs = await readJson<Club[]>(CLUBS_FILE, []);
    const next = clubs.filter((c) => c.id !== id);
    if (next.length === clubs.length) throw new Error("That club no longer exists.");
    await writeJson(CLUBS_FILE, next);
    await fs.rm(sessionsFile(id), { force: true });
  });
}

// --- sessions ------------------------------------------------------------

export function listSessions(clubId: string): Promise<Session[]> {
  return withLock(async () => {
    await migrateLegacySession();
    const sessions = await readJson<Session[]>(sessionsFile(clubId), []);
    return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  });
}

export function getSession(clubId: string, sessionId: string): Promise<Session | undefined> {
  return withLock(async () => {
    await migrateLegacySession();
    const sessions = await readJson<Session[]>(sessionsFile(clubId), []);
    return sessions.find((s) => s.id === sessionId);
  });
}

export function createSession(clubId: string, label: string): Promise<Session> {
  return withLock(async () => {
    const club = (await readJson<Club[]>(CLUBS_FILE, [])).find((c) => c.id === clubId);
    if (!club) throw new Error("That club no longer exists.");

    const sessions = await readJson<Session[]>(sessionsFile(clubId), []);
    if (sessions.some((s) => s.endedAt === null))
      throw new Error("End the current session before starting a new one.");

    // Court setup and mode/winner-priority preferences carry over from the
    // most recent session, if any, so they don't need recreating every time.
    const previous = [...sessions].sort((a, b) => b.startedAt - a.startedAt)[0];
    const session: Session = {
      id: randomUUID(),
      clubId,
      endedAt: null,
      label: label.trim(),
      startedAt: Date.now(),
      players: [],
      queue: [],
      history: [],
      courts: previous
        ? previous.courts.map((c) => ({ ...c, match: null }))
        : [court("Court 1"), court("Court 2")],
      settings: previous?.settings ?? { gameMode: "doubles", winnersStay: true },
    };
    sessions.push(session);
    await writeJson(sessionsFile(clubId), sessions);
    return session;
  });
}

export function endSession(clubId: string, sessionId: string): Promise<Session> {
  return withLock(async () => {
    const sessions = await readJson<Session[]>(sessionsFile(clubId), []);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("That session no longer exists.");
    if (session.endedAt !== null) throw new Error("That session has already ended.");
    session.endedAt = Date.now();
    await writeJson(sessionsFile(clubId), sessions);
    return session;
  });
}

export function deleteSession(clubId: string, sessionId: string): Promise<void> {
  return withLock(async () => {
    const sessions = await readJson<Session[]>(sessionsFile(clubId), []);
    const next = sessions.filter((s) => s.id !== sessionId);
    if (next.length === sessions.length) throw new Error("That session no longer exists.");
    await writeJson(sessionsFile(clubId), next);
  });
}

/** Applies a game action to a club's session; throws if it has ended. */
export function applyToSession(
  clubId: string,
  sessionId: string,
  action: Action,
): Promise<Session> {
  return withLock(async () => {
    const sessions = await readJson<Session[]>(sessionsFile(clubId), []);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("That session no longer exists.");
    if (session.endedAt !== null) throw new Error("This session has ended.");
    apply(session, action);
    await writeJson(sessionsFile(clubId), sessions);
    return session;
  });
}
