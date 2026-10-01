"use client";

import { useState } from "react";
import type { Action } from "@/lib/store";
import type { GameMode, Match, Player } from "@/lib/types";
import { playersPerTeam, SKILL_RATING } from "@/lib/types";
import { Avatar, SkillChip } from "./ui";

type Teams = { A: string[]; B: string[] };

function place(teams: Teams, id: string, target: "A" | "B", perTeam: number): Teams {
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

function strength(ids: string[], players: Map<string, Player>) {
  return ids.reduce((sum, id) => {
    const player = players.get(id);
    return sum + (player ? SKILL_RATING[player.skill] : 0);
  }, 0);
}

const sameTeams = (a: Teams, b: Teams) =>
  a.A.join(",") === b.A.join(",") && a.B.join(",") === b.B.join(",");

export function EditMatchModal({
  courtId,
  courtName,
  gameMode,
  match,
  waiting,
  players,
  dispatch,
  onClose,
}: {
  courtId: string;
  courtName: string;
  gameMode: GameMode;
  match: Match;
  waiting: Player[];
  players: Map<string, Player>;
  dispatch: (action: Action) => Promise<boolean>;
  onClose: () => void;
}) {
  const perTeam = playersPerTeam(gameMode);
  const original: Teams = { A: match.teamA, B: match.teamB };
  const [teams, setTeams] = useState<Teams>({ A: [...match.teamA], B: [...match.teamB] });
  const [submitting, setSubmitting] = useState(false);

  const assign = (id: string, target: "A" | "B") =>
    setTeams((prev) => place(prev, id, target, perTeam));

  const onCourtIds = [...match.teamA, ...match.teamB];
  const onCourtPlayers = onCourtIds
    .map((id) => players.get(id))
    .filter((p): p is Player => Boolean(p));
  const pool = [...onCourtPlayers, ...waiting];

  const ready = teams.A.length === perTeam && teams.B.length === perTeam;
  const changed = !sameTeams(teams, original);

  async function handleSave() {
    if (!ready || !changed || submitting) return;
    setSubmitting(true);
    const ok = await dispatch({
      type: "updateMatch",
      courtId,
      teamA: teams.A,
      teamB: teams.B,
    });
    setSubmitting(false);
    if (ok) onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit teams for ${courtName}`}
    >
      <div
        className="panel flex w-full max-w-lg flex-col gap-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">Edit teams — {courtName}</h2>
            <p className="text-xs text-muted">
              Move players between teams or swap in someone from the queue. The
              game clock keeps running.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-icon" aria-label="Close">
            ×
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {(["A", "B"] as const).map((side) => (
            <div key={side} className="rounded-xl bg-inset p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="label">Team {side}</span>
                <span className="text-[11px] text-muted">
                  {teams[side].length}/{perTeam}
                  {teams[side].length === perTeam &&
                    ` · str ${strength(teams[side], players)}`}
                </span>
              </div>
              {teams[side].length === 0 ? (
                <p className="py-2 text-xs text-muted">Nobody assigned.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {teams[side].map((id) => {
                    const player = players.get(id);
                    if (!player) return null;
                    return (
                      <li key={id} className="flex items-center gap-1.5">
                        <Avatar player={player} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {player.name}
                        </span>
                        <button
                          onClick={() => assign(id, side)}
                          className="btn btn-icon btn-danger"
                          aria-label={`Remove ${player.name} from team ${side}`}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div>
          <h3 className="label mb-2">On court &amp; waiting ({pool.length})</h3>
          {pool.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted">No one available.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
              {pool.map((player) => {
                const onA = teams.A.includes(player.id);
                const onB = teams.B.includes(player.id);
                const isOnCourt = onCourtIds.includes(player.id);
                return (
                  <li
                    key={player.id}
                    className="flex items-center gap-2 rounded-xl border border-border p-2"
                  >
                    <Avatar player={player} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">
                          {player.name}
                        </span>
                        <SkillChip skill={player.skill} />
                      </div>
                      <span className="text-[11px] text-muted">
                        {isOnCourt ? "currently on court" : "waiting"} ·{" "}
                        {player.gamesPlayed} played
                      </span>
                    </div>
                    <button
                      onClick={() => assign(player.id, "A")}
                      className={`pill ${onA ? "pill-on" : ""}`}
                      disabled={!onA && teams.A.length >= perTeam}
                    >
                      A
                    </button>
                    <button
                      onClick={() => assign(player.id, "B")}
                      className={`pill ${onB ? "pill-on" : ""}`}
                      disabled={!onB && teams.B.length >= perTeam}
                    >
                      B
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTeams({ A: [...original.A], B: [...original.B] })}
            className="btn"
            disabled={!changed}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary flex-1"
            disabled={!ready || !changed || submitting}
          >
            {ready ? "Save changes" : `Pick ${perTeam * 2 - teams.A.length - teams.B.length} more`}
          </button>
        </div>
      </div>
    </div>
  );
}
