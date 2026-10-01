import type { GameMode, Player } from "./types";
import { playersPerTeam, SKILL_RATING } from "./types";

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
