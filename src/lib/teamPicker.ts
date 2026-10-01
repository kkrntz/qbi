import type { Player } from "./types";
import { SKILL_RATING } from "./types";

/** Local two-team selection used by the assign/edit team-composition modals. */
export type Teams = { A: string[]; B: string[] };

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
