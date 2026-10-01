export type Skill = "beginner" | "intermediate" | "advanced";

export const SKILL_RATING: Record<Skill, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export const SKILLS: Skill[] = ["beginner", "intermediate", "advanced"];

/** A player who has checked in for the session. */
export type Player = {
  id: string;
  name: string;
  skill: Skill;
  /** `waiting` = in the queue, `playing` = on a court, `benched` = sitting out. */
  status: "waiting" | "playing" | "benched";
  gamesPlayed: number;
  wins: number;
  checkedInAt: number;
  /** When the player last joined the back of the queue, for wait times. */
  queuedAt: number | null;
};

export type Match = {
  id: string;
  teamA: string[];
  teamB: string[];
  startedAt: number;
};

export type Court = {
  id: string;
  name: string;
  /** A closed court is skipped when assigning the next game. */
  closed: boolean;
  match: Match | null;
};

export type Winner = "A" | "B" | null;

export type MatchRecord = {
  id: string;
  courtName: string;
  teamA: string[];
  teamB: string[];
  startedAt: number;
  endedAt: number;
  winner: Winner;
};

export type GameMode = "doubles" | "singles";

export type Settings = {
  gameMode: GameMode;
  /** Winners rejoin at the front of the queue instead of the back. */
  winnersStay: boolean;
};

export type SessionState = {
  /** Operator-chosen name for this session, e.g. "Tuesday Open Play". */
  label: string;
  /** When this session was created. */
  startedAt: number;
  players: Player[];
  courts: Court[];
  /** Ordered player ids waiting to play. Index 0 plays next. */
  queue: string[];
  history: MatchRecord[];
  settings: Settings;
};

/** A club or organization — owns a history of sessions over time. */
export type Club = {
  id: string;
  name: string;
  createdAt: number;
};

/**
 * One persisted session: the live/ended game data (`SessionState`) plus the
 * envelope that places it under a club and tracks its lifecycle. `endedAt`
 * is `null` while the session is active (the only one a club can have at a
 * time) and set once "End session" is used; ended sessions become
 * read-only history and are never deleted automatically.
 */
export type Session = SessionState & {
  id: string;
  clubId: string;
  endedAt: number | null;
};

export const playersPerTeam = (mode: GameMode) => (mode === "doubles" ? 2 : 1);
export const playersPerGame = (mode: GameMode) => playersPerTeam(mode) * 2;
