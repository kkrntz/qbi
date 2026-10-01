import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  Court,
  GameMode,
  MatchRecord,
  Player,
  SessionState,
  Skill,
  SKILL_RATING,
  Winner,
  playersPerGame,
  playersPerTeam,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "session.json");

const court = (name: string): Court => ({
  id: randomUUID(),
  name,
  closed: false,
  match: null,
});

const initialState = (): SessionState => ({
  players: [],
  courts: [court("Court 1"), court("Court 2")],
  queue: [],
  history: [],
  // Queue is first-come-first-served by default, with winners given priority
  // back to the front of the line instead of the back.
  settings: { gameMode: "doubles", winnersStay: true },
});

async function load(): Promise<SessionState> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as SessionState;
  } catch {
    return initialState();
  }
}

async function save(state: SessionState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Serializes reads and writes so two concurrent requests can't clobber each
 * other's view of the session file.
 */
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export function getState(): Promise<SessionState> {
  return withLock(load);
}

export function mutate(
  fn: (state: SessionState) => void,
): Promise<SessionState> {
  return withLock(async () => {
    const state = await load();
    fn(state);
    await save(state);
    return state;
  });
}

// --- helpers ---------------------------------------------------------------

const byId = (state: SessionState, id: string) =>
  state.players.find((p) => p.id === id);

function dropFromQueue(state: SessionState, id: string) {
  state.queue = state.queue.filter((q) => q !== id);
}

function enqueue(state: SessionState, id: string, front = false) {
  const player = byId(state, id);
  if (!player || player.status === "benched") return;
  dropFromQueue(state, id);
  if (front) state.queue.unshift(id);
  else state.queue.push(id);
  player.status = "waiting";
  player.queuedAt = Date.now();
}

/** How many of the most recent finished matches count as "too soon" to repeat. */
const REPEAT_LOOKBACK = 2;

const groupOf = (ids: string[]) => new Set(ids);
const isSameGroup = (ids: string[], group: Set<string>) =>
  ids.length === group.size && ids.every((id) => group.has(id));

/**
 * Picks the next `needed` players off the front of the queue, but — as much
 * as the queue allows — avoids handing back the exact same foursome that
 * played together in one of the last few matches. When that happens, the
 * two lowest-priority slots in the group are swapped for the next two
 * players waiting, so the group changes meaningfully rather than by a
 * single face; the players who have waited longest still keep their spot.
 * If the queue can't supply two replacements, it swaps as many as it can;
 * if none are available, the front of the queue plays anyway.
 */
function pickUpNextGroup(state: SessionState, needed: number): string[] {
  const recentGroups = state.history
    .slice(0, REPEAT_LOOKBACK)
    .map((match) => groupOf([...match.teamA, ...match.teamB]));

  const group = state.queue.slice(0, needed);
  if (!recentGroups.some((recent) => isSameGroup(group, recent))) return group;

  const swapCount = Math.min(2, needed, state.queue.length - needed);
  const trial = [...group];
  for (let i = 0; i < swapCount; i++) {
    // Lowest-priority slots (end of the group) make way for the next
    // players in line (start of what's left of the queue).
    trial[needed - 1 - i] = state.queue[needed + i];
  }
  return trial;
}

/**
 * Splits players into two teams of even strength by pairing the strongest
 * remaining player with the weakest one.
 */
export function balanceTeams(players: Player[], mode: GameMode) {
  const perTeam = playersPerTeam(mode);
  const sorted = [...players].sort(
    (a, b) => SKILL_RATING[b.skill] - SKILL_RATING[a.skill],
  );
  const teamA: string[] = [];
  const teamB: string[] = [];
  while (sorted.length) {
    const team = teamA.length <= teamB.length ? teamA : teamB;
    if (team.length >= perTeam) break;
    team.push(sorted.shift()!.id);
    // The strongest player left takes the weakest as a partner, so each team
    // ends up with comparable total strength.
    if (team.length < perTeam && sorted.length) team.push(sorted.pop()!.id);
  }
  return { teamA, teamB };
}

// --- actions ---------------------------------------------------------------

export type Action =
  | { type: "checkIn"; name: string; skill: Skill }
  | { type: "checkOut"; playerId: string }
  | { type: "setBenched"; playerId: string; benched: boolean }
  | { type: "moveInQueue"; playerId: string; direction: "up" | "down" }
  | { type: "sendToFront"; playerId: string }
  | { type: "addCourt" }
  | { type: "removeCourt"; courtId: string }
  | { type: "setCourtClosed"; courtId: string; closed: boolean }
  | { type: "startGame"; courtId: string }
  | { type: "endGame"; courtId: string; winner: Winner }
  | { type: "cancelGame"; courtId: string }
  | { type: "setGameMode"; gameMode: GameMode }
  | { type: "setWinnersStay"; winnersStay: boolean }
  | { type: "resetSession" };

export function apply(state: SessionState, action: Action): void {
  switch (action.type) {
    case "checkIn": {
      const name = action.name.trim();
      if (!name) throw new Error("A player needs a name.");
      const player: Player = {
        id: randomUUID(),
        name,
        skill: action.skill,
        status: "waiting",
        gamesPlayed: 0,
        wins: 0,
        checkedInAt: Date.now(),
        queuedAt: Date.now(),
      };
      state.players.push(player);
      // New arrivals join ahead of anyone already queued who has played at
      // least one game this session, but behind players still waiting for
      // their first game — everyone gets a first game before regulars get
      // a second, and FCFS still decides order within each group.
      const aheadOf = state.queue.findIndex((id) => {
        const existing = byId(state, id);
        return !existing || existing.gamesPlayed > 0;
      });
      if (aheadOf === -1) state.queue.push(player.id);
      else state.queue.splice(aheadOf, 0, player.id);
      return;
    }

    case "checkOut": {
      const player = byId(state, action.playerId);
      if (!player) return;
      if (player.status === "playing")
        throw new Error(`${player.name} is in a game — end it first.`);
      state.players = state.players.filter((p) => p.id !== action.playerId);
      dropFromQueue(state, action.playerId);
      return;
    }

    case "setBenched": {
      const player = byId(state, action.playerId);
      if (!player) return;
      if (player.status === "playing")
        throw new Error(`${player.name} is in a game — end it first.`);
      if (action.benched) {
        player.status = "benched";
        player.queuedAt = null;
        dropFromQueue(state, action.playerId);
      } else {
        player.status = "waiting";
        enqueue(state, action.playerId);
      }
      return;
    }

    case "moveInQueue": {
      const i = state.queue.indexOf(action.playerId);
      const j = action.direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= state.queue.length) return;
      [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
      return;
    }

    case "sendToFront":
      enqueue(state, action.playerId, true);
      return;

    case "addCourt": {
      const next = state.courts.length + 1;
      state.courts.push(court(`Court ${next}`));
      return;
    }

    case "removeCourt": {
      const target = state.courts.find((c) => c.id === action.courtId);
      if (!target) return;
      if (target.match)
        throw new Error(`${target.name} has a game in progress.`);
      state.courts = state.courts.filter((c) => c.id !== action.courtId);
      return;
    }

    case "setCourtClosed": {
      const target = state.courts.find((c) => c.id === action.courtId);
      if (!target) return;
      if (target.match)
        throw new Error(`${target.name} has a game in progress.`);
      target.closed = action.closed;
      return;
    }

    case "startGame": {
      const target = state.courts.find((c) => c.id === action.courtId);
      if (!target) throw new Error("That court no longer exists.");
      if (target.match) throw new Error(`${target.name} is already busy.`);
      if (target.closed) throw new Error(`${target.name} is closed.`);

      const needed = playersPerGame(state.settings.gameMode);
      if (state.queue.length < needed)
        throw new Error(
          `Need ${needed} players in the queue to start a ${state.settings.gameMode} game.`,
        );

      const upNextIds = pickUpNextGroup(state, needed);
      const upNext = upNextIds
        .map((id) => byId(state, id))
        .filter((p): p is Player => Boolean(p));
      const { teamA, teamB } = balanceTeams(upNext, state.settings.gameMode);

      const chosen = new Set(upNextIds);
      state.queue = state.queue.filter((id) => !chosen.has(id));
      for (const player of upNext) {
        player.status = "playing";
        player.queuedAt = null;
      }
      target.match = { id: randomUUID(), teamA, teamB, startedAt: Date.now() };
      return;
    }

    case "endGame": {
      const target = state.courts.find((c) => c.id === action.courtId);
      if (!target?.match) return;
      const { match } = target;

      const record: MatchRecord = {
        id: match.id,
        courtName: target.name,
        teamA: match.teamA,
        teamB: match.teamB,
        startedAt: match.startedAt,
        endedAt: Date.now(),
        winner: action.winner,
      };
      state.history.unshift(record);
      state.history = state.history.slice(0, 50);

      const winningIds =
        action.winner === "A"
          ? match.teamA
          : action.winner === "B"
            ? match.teamB
            : [];
      for (const id of [...match.teamA, ...match.teamB]) {
        const player = byId(state, id);
        if (!player) continue;
        player.gamesPlayed += 1;
        if (winningIds.includes(id)) player.wins += 1;
      }

      // Everyone rejoins at the back of the existing queue — nobody cuts
      // ahead of players who were already waiting. Winner priority only
      // orders this match's two teams relative to each other: the winning
      // team is appended first, landing just ahead of the losing team
      // within the new block at the end of the line.
      const losingIds = [...match.teamA, ...match.teamB].filter(
        (id) => !winningIds.includes(id),
      );
      const rejoinOrder = state.settings.winnersStay
        ? [...winningIds, ...losingIds]
        : [...match.teamA, ...match.teamB];
      for (const id of rejoinOrder) enqueue(state, id);

      target.match = null;
      return;
    }

    case "cancelGame": {
      const target = state.courts.find((c) => c.id === action.courtId);
      if (!target?.match) return;
      const { match } = target;
      for (const id of [...match.teamA, ...match.teamB])
        enqueue(state, id, true);
      target.match = null;
      return;
    }

    case "setGameMode":
      state.settings.gameMode = action.gameMode;
      return;

    case "setWinnersStay":
      state.settings.winnersStay = action.winnersStay;
      return;

    case "resetSession": {
      const fresh = initialState();
      fresh.courts = state.courts.map((c) => ({ ...c, match: null }));
      fresh.settings = state.settings;
      Object.assign(state, fresh);
      return;
    }
  }
}
