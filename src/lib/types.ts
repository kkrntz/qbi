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

/** Per-club rollup for the super admin dashboard. */
export type ClubReportSummary = {
  clubId: string;
  clubName: string;
  totalSessions: number;
  activeSession: { id: string; label: string; startedAt: number } | null;
  /** Sum of players checked in across all of this club's sessions — not
   * deduplicated, since a player has no identity beyond one session. */
  totalCheckIns: number;
  totalGames: number;
  /** Most recent session start across this club, or null if it has none. */
  lastActivityAt: number | null;
};

/** One row in the cross-club recent-activity feed. */
export type RecentSessionSummary = {
  clubId: string;
  clubName: string;
  sessionId: string;
  label: string;
  startedAt: number;
  endedAt: number | null;
  checkIns: number;
  games: number;
};

/** Platform-wide stats for the super admin landing page. */
export type PlatformReport = {
  clubCount: number;
  activeSessionCount: number;
  totalSessions: number;
  totalGames: number;
  totalCheckIns: number;
  clubs: ClubReportSummary[];
  recentSessions: RecentSessionSummary[];
};

/** `super_admin` manages every club; `club_admin` manages only `clubIds`. */
export type Role = "super_admin" | "club_admin";

export type User = {
  id: string;
  email: string;
  /** `scrypt` hash, stored as `salt:hash` (both hex). Never sent to the client. */
  passwordHash: string;
  role: Role;
  /** Clubs this user administers. Ignored (implicitly "all") for super_admin. */
  clubIds: string[];
  createdAt: number;
};

/** Safe-to-send-to-the-client view of a User — no passwordHash. */
export type PublicUser = Omit<User, "passwordHash">;
