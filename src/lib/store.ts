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
  settings: { gameMode: "doubles", winnersStay: false },
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
      state.queue.push(player.id);
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
      const upNextIds = state.queue.slice(0, needed);
      if (upNextIds.length < needed)
        throw new Error(
          `Need ${needed} players in the queue to start a ${state.settings.gameMode} game.`,
        );

      const upNext = upNextIds
        .map((id) => byId(state, id))
        .filter((p): p is Player => Boolean(p));
      const { teamA, teamB } = balanceTeams(upNext, state.settings.gameMode);

      state.queue = state.queue.slice(needed);
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

      const losingIds = [...match.teamA, ...match.teamB].filter(
        (id) => !winningIds.includes(id),
      );
      for (const id of losingIds) enqueue(state, id);
      if (state.settings.winnersStay) {
        // Reversed so unshifting leaves the winning team in its own order.
        for (const id of [...winningIds].reverse()) enqueue(state, id, true);
      } else {
        for (const id of winningIds) enqueue(state, id);
      }

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
