import type { SessionState } from "./types";

/** Readable, name-based snapshot of a session — safe to hand to a spreadsheet. */
export function buildSessionExport(state: SessionState) {
  const playerName = new Map(state.players.map((p) => [p.id, p.name]));
  const name = (id: string) => playerName.get(id) ?? "Unknown player";

  return {
    label: state.label || "Untitled session",
    startedAt: new Date(state.startedAt).toISOString(),
    exportedAt: new Date().toISOString(),
    durationMinutes: Math.round((Date.now() - state.startedAt) / 60000),
    settings: state.settings,
    players: [...state.players]
      .sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed)
      .map((p) => ({
        name: p.name,
        skill: p.skill,
        gamesPlayed: p.gamesPlayed,
        wins: p.wins,
      })),
    matches: [...state.history]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((m) => ({
        court: m.courtName,
        teamA: m.teamA.map(name),
        teamB: m.teamB.map(name),
        winner: m.winner,
        startedAt: new Date(m.startedAt).toISOString(),
        endedAt: new Date(m.endedAt).toISOString(),
        durationMinutes: Math.round((m.endedAt - m.startedAt) / 60000),
      })),
  };
}

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function sessionFileName(state: SessionState) {
  const date = new Date(state.startedAt).toISOString().slice(0, 10);
  const slug = slugify(state.label);
  return `pickleball-session-${date}${slug ? `-${slug}` : ""}.json`;
}

/** Triggers a browser download of `data` as a pretty-printed JSON file. */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
