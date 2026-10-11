import type { GameMode, MatchRecord, Player } from "./types";
import { playersPerGame, playersPerTeam, SKILL_RATING } from "./types";

/** Local two-team selection used by the assign/edit team-composition modals. */
export type Teams = { A: string[]; B: string[] };

/**
 * Splits players into two teams of even strength by pairing the strongest
 * remaining player with the weakest one.
 */
export function balanceTeams(players: Player[], mode: GameMode): Teams {
  const perTeam = playersPerTeam(mode);
  const sorted = [...players].sort(
    (a, b) => SKILL_RATING[b.skill] - SKILL_RATING[a.skill],
  );
  const A: string[] = [];
  const B: string[] = [];
  while (sorted.length) {
    const team = A.length <= B.length ? A : B;
    if (team.length >= perTeam) break;
    team.push(sorted.shift()!.id);
    // The strongest player left takes the weakest as a partner, so each team
    // ends up with comparable total strength.
    if (team.length < perTeam && sorted.length) team.push(sorted.pop()!.id);
  }
  return { A, B };
}

/** The player's partner, if the two have paired up with each other. */
export function partnerOf(
  player: Player | undefined,
  players: Map<string, Player>,
): Player | null {
  if (!player?.partnerId) return null;
  const partner = players.get(player.partnerId);
  return partner && partner.partnerId === player.id ? partner : null;
}

/** How many of the most recent finished matches count as "too soon" to repeat. */
const REPEAT_LOOKBACK = 2;

/** The groups that played together in the last few finished matches. */
export const recentGroups = (history: MatchRecord[]) =>
  history.slice(0, REPEAT_LOOKBACK).map((match) => [...match.teamA, ...match.teamB]);

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
 * Picks who plays next off the front of the queue. Pairs are kept together
 * (a pair that doesn't fit the last open slot waits for the next game), and
 * — as much as the queue allows — it avoids handing back the exact same
 * group that played together in one of the last few matches: the two
 * lowest-priority players are swapped for the next ones waiting, so the
 * group changes meaningfully rather than by a single face, while the
 * players who have waited longest keep their spot. If the queue can't
 * supply two replacements it swaps one; if none, the front of the queue
 * plays anyway.
 */
export function nextGroup(
  queue: string[],
  players: Map<string, Player>,
  mode: GameMode,
  recent: string[][],
): string[] {
  const needed = playersPerGame(mode);
  const units = queueUnits(queue, players, mode);
  const first = fillGame(units, needed);
  // Only pairs left that can't make up a full game together with whoever is
  // ahead of them: play in plain queue order rather than leave a court idle.
  if (!first) return queue.slice(0, needed);

  const group = first.flat();
  const isRepeat = recent.some(
    (played) => played.length === group.length && group.every((id) => played.includes(id)),
  );
  if (!isRepeat) return group;

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
    if (swapped) return swapped.flat();
  }
  return group;
}

/**
 * Splits a group into two teams. In doubles, a pair in the group plays
 * together (so the other two do as well); otherwise teams are balanced by
 * skill.
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
  return balanceTeams(group, mode);
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

export function teamStrength(ids: string[], players: Map<string, Player>) {
  return ids.reduce((sum, id) => {
    const player = players.get(id);
    return sum + (player ? SKILL_RATING[player.skill] : 0);
  }, 0);
}

export const sameTeams = (a: Teams, b: Teams) =>
  a.A.join(",") === b.A.join(",") && a.B.join(",") === b.B.join(",");
