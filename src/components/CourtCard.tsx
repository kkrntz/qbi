"use client";

import type { Dispatch } from "@/lib/useSession";
import type { Court, GameMode, Player } from "@/lib/types";
import type { Teams } from "@/lib/teamPicker";
import { playersPerGame } from "@/lib/types";
import { formatClock } from "@/lib/format";
import { PlayerLinkButton } from "./PlayerLinkButton";
import { Avatar, SkillChip } from "./ui";

type Props = {
  clubId: string;
  sessionId: string;
  court: Court;
  players: Map<string, Player>;
  gameMode: GameMode;
  queueDepth: number;
  now: number;
  canRemove: boolean;
  dispatch: Dispatch;
  /** False renders this court read-only: no start/end/edit/court-management
   * controls, just the live state. */
  canManage: boolean;
  onEditMatch: () => void;
  onAssignPlayers: () => void;
  /** The lineup previewed by "Start next game", not yet on the court. */
  projected: Teams | null;
  onProjectGame: () => void;
  onClearProjection: () => void;
};

function Team({
  clubId,
  sessionId,
  label,
  ids,
  players,
  onWin,
}: {
  clubId: string;
  sessionId: string;
  label: string;
  ids: string[];
  players: Map<string, Player>;
  onWin?: () => void;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-inset p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label">{label}</span>
        {onWin && (
          <button onClick={onWin} className="btn btn-ball px-2 py-1 text-xs">
            Won
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {ids.map((id) => {
          const player = players.get(id);
          if (!player) return null;
          return (
            <li key={id} className="flex items-center gap-2">
              <Avatar player={player} />
              <span
                className="min-w-0 flex-1 truncate text-sm font-semibold"
                title={player.name}
              >
                {player.name}
              </span>
              <SkillChip skill={player.skill} />
              <PlayerLinkButton
                clubId={clubId}
                sessionId={sessionId}
                playerId={id}
                playerName={player.name}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CourtCard({
  clubId,
  sessionId,
  court,
  players,
  gameMode,
  queueDepth,
  now,
  canRemove,
  dispatch,
  canManage,
  onEditMatch,
  onAssignPlayers,
  projected,
  onProjectGame,
  onClearProjection,
}: Props) {
  const needed = playersPerGame(gameMode);
  const shortBy = needed - queueDepth;
  const preview = canManage && !court.match && !court.closed ? projected : null;
  // Someone in the preview may have since been sent to another court, benched
  // or checked out — the lineup has to be picked again before it can start.
  const projectionStale =
    preview !== null &&
    [...preview.A, ...preview.B].some((id) => players.get(id)?.status !== "waiting");

  async function startProjected() {
    if (!preview || projectionStale) return;
    const ok = await dispatch({
      type: "startCustomGame",
      courtId: court.id,
      teamA: preview.A,
      teamB: preview.B,
    });
    if (ok) onClearProjection();
  }

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold">{court.name}</h3>
          {court.match ? (
            <span className="chip bg-ball text-ball-ink">live</span>
          ) : court.closed ? (
            <span className="chip bg-inset text-muted">closed</span>
          ) : (
            <span className="chip bg-accent-soft text-accent">open</span>
          )}
        </div>
        {court.match ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tabular-nums text-accent">
              {formatClock(now - court.match.startedAt)}
            </span>
            {canManage && (
              <button
                onClick={onEditMatch}
                className="btn btn-icon"
                aria-label={`Edit teams for ${court.name}`}
                title="Move players between teams or swap in someone from the queue"
              >
                ✎
              </button>
            )}
          </div>
        ) : (
          canManage && (
            <div className="flex gap-1">
              <button
                onClick={() =>
                  dispatch({
                    type: "setCourtClosed",
                    courtId: court.id,
                    closed: !court.closed,
                  })
                }
                className="btn px-2 py-1 text-xs"
              >
                {court.closed ? "Reopen" : "Close"}
              </button>
              {canRemove && (
                <button
                  onClick={() =>
                    dispatch({ type: "removeCourt", courtId: court.id })
                  }
                  className="btn btn-danger px-2 py-1 text-xs"
                  aria-label={`Remove ${court.name}`}
                >
                  Remove
                </button>
              )}
            </div>
          )
        )}
      </header>

      {court.match ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Team
              clubId={clubId}
              sessionId={sessionId}
              label="Team A"
              ids={court.match.teamA}
              players={players}
              onWin={
                canManage
                  ? () => dispatch({ type: "endGame", courtId: court.id, winner: "A" })
                  : undefined
              }
            />
            <span className="text-center text-xs font-bold text-muted">vs</span>
            <Team
              clubId={clubId}
              sessionId={sessionId}
              label="Team B"
              ids={court.match.teamB}
              players={players}
              onWin={
                canManage
                  ? () => dispatch({ type: "endGame", courtId: court.id, winner: "B" })
                  : undefined
              }
            />
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm(`End the game on ${court.name} with no winner?`))
                    dispatch({ type: "endGame", courtId: court.id, winner: null });
                }}
                className="btn flex-1"
              >
                End, no winner
              </button>
              <button
                onClick={() => dispatch({ type: "cancelGame", courtId: court.id })}
                className="btn btn-danger"
                title="Put these players back at the front of the queue"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      ) : preview ? (
        <>
          <p className="text-xs text-muted">
            Up next on {court.name} — check the lineup, then start the game.
          </p>
          <div className="flex flex-col gap-1.5">
            <Team clubId={clubId} sessionId={sessionId} label="Team A" ids={preview.A} players={players} />
            <span className="text-center text-xs font-bold text-muted">vs</span>
            <Team clubId={clubId} sessionId={sessionId} label="Team B" ids={preview.B} players={players} />
          </div>
          {projectionStale && (
            <p className="text-xs font-semibold text-danger">
              Someone in this lineup is no longer waiting — cancel and start the next game again.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={startProjected}
              className="btn btn-primary flex-1"
              disabled={projectionStale}
            >
              Start game
            </button>
            <button
              onClick={onAssignPlayers}
              className="btn"
              title="Rearrange the teams or swap anyone before starting"
            >
              Adjust…
            </button>
            <button onClick={onClearProjection} className="btn btn-danger">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-inset px-3 py-6">
          <p className="text-sm text-muted">
            {court.closed
              ? "Court is out of rotation."
              : shortBy > 0
                ? `Waiting on ${shortBy} more player${shortBy > 1 ? "s" : ""}.`
                : "Ready for the next group."}
          </p>
          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={onProjectGame}
                className="btn btn-primary"
                disabled={court.closed || shortBy > 0}
                title="Preview the next players in line before putting them on the court"
              >
                Start next game
              </button>
              <button
                onClick={onAssignPlayers}
                className="btn"
                disabled={court.closed || shortBy > 0}
                title="Pick who plays and arrange the teams yourself, then start"
              >
                Assign players…
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
