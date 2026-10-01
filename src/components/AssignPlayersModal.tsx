"use client";

import { useState } from "react";
import type { Action } from "@/lib/store";
import type { GameMode, Player } from "@/lib/types";
import { playersPerTeam } from "@/lib/types";
import { place, teamStrength, type Teams } from "@/lib/teamPicker";
import { Avatar, SkillChip } from "./ui";

export function AssignPlayersModal({
  courtId,
  courtName,
  gameMode,
  waiting,
  players,
  dispatch,
  onClose,
}: {
  courtId: string;
  courtName: string;
  gameMode: GameMode;
  waiting: Player[];
  players: Map<string, Player>;
  dispatch: (action: Action) => Promise<boolean>;
  onClose: () => void;
}) {
  const perTeam = playersPerTeam(gameMode);
  const [teams, setTeams] = useState<Teams>({ A: [], B: [] });
  const [submitting, setSubmitting] = useState(false);

  const assign = (id: string, target: "A" | "B") =>
    setTeams((prev) => place(prev, id, target, perTeam));

  const ready = teams.A.length === perTeam && teams.B.length === perTeam;

  async function handleStart() {
    if (!ready || submitting) return;
    setSubmitting(true);
    const ok = await dispatch({
      type: "startCustomGame",
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
      aria-label={`Assign players to ${courtName}`}
    >
      <div
        className="panel flex w-full max-w-lg flex-col gap-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">Assign players — {courtName}</h2>
            <p className="text-xs text-muted">
              Pick who plays, arrange the teams, then start the game.
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
                    ` · str ${teamStrength(teams[side], players)}`}
                </span>
              </div>
              {teams[side].length === 0 ? (
                <p className="py-2 text-xs text-muted">Nobody picked yet.</p>
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
          <h3 className="label mb-2">Waiting ({waiting.length})</h3>
          {waiting.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted">
              No one is waiting right now.
            </p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
              {waiting.map((player, index) => {
                const onA = teams.A.includes(player.id);
                const onB = teams.B.includes(player.id);
                return (
                  <li
                    key={player.id}
                    className="flex items-center gap-2 rounded-xl border border-border p-2"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-muted">
                      {index + 1}
                    </span>
                    <Avatar player={player} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">
                          {player.name}
                        </span>
                        <SkillChip skill={player.skill} />
                      </div>
                      <span className="text-[11px] text-muted">
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
            onClick={() => setTeams({ A: [], B: [] })}
            className="btn"
            disabled={teams.A.length === 0 && teams.B.length === 0}
          >
            Clear
          </button>
          <button
            onClick={handleStart}
            className="btn btn-primary flex-1"
            disabled={!ready || submitting}
          >
            {ready ? "Start game" : `Pick ${perTeam * 2 - teams.A.length - teams.B.length} more`}
          </button>
        </div>
      </div>
    </div>
  );
}
