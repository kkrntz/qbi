import type { GameMode, MatchRecord, Player } from "./types";
import { playersPerGame, playersPerTeam } from "./types";

/** Local two-team selection used by the assign/edit team-composition modals. */
export type Teams = { A: string[]; B: string[] };

/** The player's partner, if the two have paired up with each other. */
export function partnerOf(
  player: Player | undefined,
  players: Map<string, Player>,
): Player | null {
  if (!player?.partnerId) return null;
  const partner = players.get(player.partnerId);
  return partner && partner.partnerId === player.id ? partner : null;
}

/** The groups that have played together in a finished match this session. */
export const playedGroups = (history: MatchRecord[]) =>
  history.map((match) => [...match.teamA, ...match.teamB]);

/**
 * The queue as the units that get called up together: single players, plus
 * (in doubles) pairs who are both waiting. A pair stands where its later
 * member does, so pairing up never moves anyone ahead in line.
 */
function queueUnits(
  queue: string[],
  players: Map<string, Player>,
  mode: GameMode,
): string[][] {
  if (mode !== "doubles") return queue.map((id) => [id]);
  const position = new Map(queue.map((id, index) => [id, index]));
  const units: string[][] = [];
  queue.forEach((id, index) => {
    const partner = partnerOf(players.get(id), players);
    const partnerIndex = partner ? position.get(partner.id) : undefined;
    if (!partner || partnerIndex === undefined) units.push([id]);
    else if (partnerIndex < index) units.push([partner.id, id]);
  });
  return units;
}

/** Takes units in order until the game is full, skipping a pair that won't fit. */
function fillGame(units: string[][], needed: number): string[][] | null {
  const chosen: string[][] = [];
  let size = 0;
  for (const unit of units) {
    if (size + unit.length > needed) continue;
    chosen.push(unit);
    size += unit.length;
    if (size === needed) return chosen;
  }
  return null;
}

/**
 * Every way to fill a game from `units`, in queue order: groups made of
 * earlier units come first.
 */
function* allGames(
  units: string[][],
  needed: number,
  start = 0,
  chosen: string[][] = [],
  size = 0,
): Generator<string[][]> {
  if (size === needed) {
    yield chosen;
    return;
  }
  for (let i = start; i < units.length; i++) {
    if (size + units[i].length > needed) continue;
    yield* allGames(units, needed, i + 1, [...chosen, units[i]], size + units[i].length);
  }
}

/**
 * Picks who plays next off the front of the queue. Pairs are kept together
 * (a pair that doesn't fit the last open slot waits for the next game), and
 * — as much as the queue allows — it avoids handing back the exact same
 * group that already played together earlier in the session: the two
 * lowest-priority players are swapped for the next ones waiting, so the
 * group changes meaningfully rather than by a single face, while the
 * players who have waited longest keep their spot. If that's also a
 * repeat it swaps one; failing that, it takes the earliest group in queue
 * order that hasn't played together. Only if every possible group has
 * played does the front of the queue play anyway.
 */
export function nextGroup(
  queue: string[],
  players: Map<string, Player>,
  mode: GameMode,
  played: string[][],
): string[] {
  const needed = playersPerGame(mode);
  const units = queueUnits(queue, players, mode);
  const first = fillGame(units, needed);
  // Only pairs left that can't make up a full game together with whoever is
  // ahead of them: play in plain queue order rather than leave a court idle.
  if (!first) return queue.slice(0, needed);

  const isRepeat = (group: string[]) =>
    played.some(
      (ids) => ids.length === group.length && group.every((id) => ids.includes(id)),
    );
  const group = first.flat();
  if (!isRepeat(group)) return group;

  for (const swapCount of [2, 1]) {
    const dropped = new Set<string[]>();
    let count = 0;
    for (let i = first.length - 1; i >= 0 && count < swapCount; i--) {
      dropped.add(first[i]);
      count += first[i].length;
    }
    const swapped = fillGame(
      units.filter((unit) => !dropped.has(unit)),
      needed,
    );
    if (swapped && !isRepeat(swapped.flat())) return swapped.flat();
  }
  for (const game of allGames(units, needed)) {
    if (!isRepeat(game.flat())) return game.flat();
  }
  return group;
}

/**
 * Splits a group into two teams. In doubles, a pair in the group plays
 * together (so the other two do as well); otherwise the group is split in
 * queue order — the first half against the second.
 */
export function splitTeams(group: Player[], mode: GameMode): Teams {
  if (mode === "doubles") {
    const inGroup = new Map(group.map((p) => [p.id, p]));
    for (const player of group) {
      const partner = partnerOf(player, inGroup);
      if (!partner) continue;
      const A = [player.id, partner.id];
      return { A, B: group.filter((p) => !A.includes(p.id)).map((p) => p.id) };
    }
  }
  const perTeam = playersPerTeam(mode);
  const ids = group.map((p) => p.id);
  return { A: ids.slice(0, perTeam), B: ids.slice(perTeam) };
}

/**
 * The lineup "Start next game" would pick from `waiting` (in queue order):
 * the next group in line, split into teams. Empty when there aren't enough
 * players waiting for a full game.
 */
export function projectTeams(
  waiting: Player[],
  players: Map<string, Player>,
  history: MatchRecord[],
  mode: GameMode,
): Teams {
  if (waiting.length < playersPerGame(mode)) return { A: [], B: [] };
  const queue = waiting.map((p) => p.id);
  const upNext = nextGroup(queue, players, mode, playedGroups(history));
  return splitTeams(
    waiting.filter((p) => upNext.includes(p.id)),
    mode,
  );
}

/**
 * Toggles or moves a player into team `target`. Clicking a player already on
 * that team removes them; clicking them while on the other team moves them
 * over (if there's room); a full team ignores the click.
 */
export function place(teams: Teams, id: string, target: "A" | "B", perTeam: number): Teams {
  if (teams[target].includes(id)) {
    return { ...teams, [target]: teams[target].filter((x) => x !== id) };
  }
  if (teams[target].length >= perTeam) return teams;
  const other = target === "A" ? "B" : "A";
  return {
    ...teams,
    [target]: [...teams[target], id],
    [other]: teams[other].filter((x) => x !== id),
  };
}

export const sameTeams = (a: Teams, b: Teams) =>
  a.A.join(",") === b.A.join(",") && a.B.join(",") === b.B.join(",");
