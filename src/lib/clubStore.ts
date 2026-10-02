import { randomUUID } from "crypto";
import { apply, court, type Action } from "./store";
import type { Club, PlatformReport, Session, SessionState } from "./types";
import { createDocIfAbsent, readDoc, removeDoc, updateDoc } from "./storage";

// Document keys; see ./storage for where they live (DATA_DIR or S3).
const CLUBS_KEY = "clubs.json";
const LEGACY_SESSION_KEY = "session.json";
const sessionsFile = (clubId: string) => `club-sessions/${clubId}.json`;

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

  if ((await readDoc<Club[]>(CLUBS_KEY, [])).length > 0) return; // already set up

  const legacy = await readDoc<Partial<SessionState> | null>(LEGACY_SESSION_KEY, null);
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
  // Only seeds if clubs.json still doesn't exist, so a concurrent first
  // request on another instance can't double-import.
  const stored = await createDocIfAbsent<Club[]>(CLUBS_KEY, [club]);
  if (stored.some((c) => c.id === club.id))
    await createDocIfAbsent(sessionsFile(club.id), [session]);
}

// --- clubs -------------------------------------------------------------

export async function listClubs(): Promise<Club[]> {
  await migrateLegacySession();
  const clubs = await readDoc<Club[]>(CLUBS_KEY, []);
  return [...clubs].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClub(id: string): Promise<Club | undefined> {
  await migrateLegacySession();
  return (await readDoc<Club[]>(CLUBS_KEY, [])).find((c) => c.id === id);
}

export async function createClub(name: string): Promise<Club> {
  await migrateLegacySession();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A club needs a name.");
  const club: Club = { id: randomUUID(), name: trimmed, createdAt: Date.now() };
  await createDocIfAbsent<Session[]>(sessionsFile(club.id), []);
  await updateDoc<Club[], void>(CLUBS_KEY, [], (clubs) => {
    clubs.push(club);
  });
  return club;
}

export function renameClub(id: string, name: string): Promise<Club> {
  const trimmed = name.trim();
  if (!trimmed) return Promise.reject(new Error("A club needs a name."));
  return updateDoc<Club[], Club>(CLUBS_KEY, [], (clubs) => {
    const club = clubs.find((c) => c.id === id);
    if (!club) throw new Error("That club no longer exists.");
    club.name = trimmed;
    return club;
  });
}

export async function deleteClub(id: string): Promise<void> {
  await updateDoc<Club[], void>(CLUBS_KEY, [], (clubs) => {
    const index = clubs.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("That club no longer exists.");
    clubs.splice(index, 1);
  });
  await removeDoc(sessionsFile(id));
}

// --- sessions ------------------------------------------------------------

export async function listSessions(clubId: string): Promise<Session[]> {
  await migrateLegacySession();
  const sessions = await readDoc<Session[]>(sessionsFile(clubId), []);
  return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
}

export async function getSession(
  clubId: string,
  sessionId: string,
): Promise<Session | undefined> {
  await migrateLegacySession();
  return (await readDoc<Session[]>(sessionsFile(clubId), [])).find((s) => s.id === sessionId);
}

export async function createSession(clubId: string, label: string): Promise<Session> {
  const club = (await readDoc<Club[]>(CLUBS_KEY, [])).find((c) => c.id === clubId);
  if (!club) throw new Error("That club no longer exists.");

  return updateDoc<Session[], Session>(sessionsFile(clubId), [], (sessions) => {
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
    return session;
  });
}

export function endSession(clubId: string, sessionId: string): Promise<Session> {
  return updateDoc<Session[], Session>(sessionsFile(clubId), [], (sessions) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("That session no longer exists.");
    if (session.endedAt !== null) throw new Error("That session has already ended.");
    session.endedAt = Date.now();
    return session;
  });
}

export function deleteSession(clubId: string, sessionId: string): Promise<void> {
  return updateDoc<Session[], void>(sessionsFile(clubId), [], (sessions) => {
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) throw new Error("That session no longer exists.");
    sessions.splice(index, 1);
  });
}

// --- reporting -------------------------------------------------------------

const RECENT_SESSIONS_LIMIT = 15;

/**
 * Builds a report over exactly the clubs passed in. Shared by the
 * super-admin platform report (every club) and the club-admin report
 * (just the clubs they're assigned to) — the aggregation is identical,
 * only which clubs feed into it differs, and filtering the Club[] up
 * front (rather than filtering the finished report) means a club admin's
 * totals, and the file reads behind them, never touch another club's data.
 */
async function buildReport(clubs: Club[]): Promise<PlatformReport> {
  let activeSessionCount = 0;
  let totalSessions = 0;
  let totalGames = 0;
  let totalCheckIns = 0;
  const clubSummaries: PlatformReport["clubs"] = [];
  const allSessions: { club: Club; session: Session }[] = [];

  for (const club of clubs) {
    const sessions = await readDoc<Session[]>(sessionsFile(club.id), []);
    const active = sessions.find((s) => s.endedAt === null) ?? null;
    const clubGames = sessions.reduce((sum, s) => sum + s.history.length, 0);
    const clubCheckIns = sessions.reduce((sum, s) => sum + s.players.length, 0);
    const lastActivityAt = sessions.reduce<number | null>(
      (max, s) => (max === null || s.startedAt > max ? s.startedAt : max),
      null,
    );

    activeSessionCount += active ? 1 : 0;
    totalSessions += sessions.length;
    totalGames += clubGames;
    totalCheckIns += clubCheckIns;

    clubSummaries.push({
      clubId: club.id,
      clubName: club.name,
      totalSessions: sessions.length,
      activeSession: active
        ? { id: active.id, label: active.label, startedAt: active.startedAt }
        : null,
      totalCheckIns: clubCheckIns,
      totalGames: clubGames,
      lastActivityAt,
    });

    for (const session of sessions) allSessions.push({ club, session });
  }

  clubSummaries.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));

  const recentSessions = allSessions
    .sort((a, b) => b.session.startedAt - a.session.startedAt)
    .slice(0, RECENT_SESSIONS_LIMIT)
    .map(({ club, session }) => ({
      clubId: club.id,
      clubName: club.name,
      sessionId: session.id,
      label: session.label,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      checkIns: session.players.length,
      games: session.history.length,
    }));

  return {
    clubCount: clubs.length,
    activeSessionCount,
    totalSessions,
    totalGames,
    totalCheckIns,
    clubs: clubSummaries,
    recentSessions,
  };
}

/**
 * Cross-club rollup for the super admin landing page: totals, a per-club
 * breakdown, and a recent-activity feed over every club. Reads every
 * club's sessions document once — fine at the scale this app's JSON-document
 * store targets (a handful to a few dozen clubs), and simplest to keep
 * correct as the data model changes, rather than maintaining running
 * totals that could drift.
 */
export async function getPlatformReport(): Promise<PlatformReport> {
  await migrateLegacySession();
  return buildReport(await readDoc<Club[]>(CLUBS_KEY, []));
}

/**
 * Same rollup, scoped to one club admin's assigned clubs — the landing
 * page for a club admin who runs more than one club. Filters the club
 * list before reading any session document, so a club not in `clubIds` is
 * never touched.
 */
export async function getClubAdminReport(clubIds: string[]): Promise<PlatformReport> {
  await migrateLegacySession();
  const clubs = await readDoc<Club[]>(CLUBS_KEY, []);
  return buildReport(clubs.filter((c) => clubIds.includes(c.id)));
}

/** Applies a game action to a club's session; throws if it has ended. */
export function applyToSession(
  clubId: string,
  sessionId: string,
  action: Action,
): Promise<Session> {
  return updateDoc<Session[], Session>(sessionsFile(clubId), [], (sessions) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("That session no longer exists.");
    if (session.endedAt !== null) throw new Error("This session has ended.");
    apply(session, action);
    return session;
  });
}
