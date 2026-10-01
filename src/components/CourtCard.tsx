"use client";

import type { Action } from "@/lib/store";
import type { Court, GameMode, Player } from "@/lib/types";
import { playersPerGame } from "@/lib/types";
import { formatClock } from "@/lib/format";
import { Avatar, SkillChip } from "./ui";

type Props = {
  court: Court;
  players: Map<string, Player>;
  gameMode: GameMode;
  queueDepth: number;
  now: number;
  canRemove: boolean;
  dispatch: (action: Action) => Promise<boolean>;
  onEditMatch: () => void;
};

function Team({
  label,
  ids,
  players,
  onWin,
}: {
  label: string;
  ids: string[];
  players: Map<string, Player>;
  onWin?: () => void;
}) {
  return (
    <div className="flex-1 rounded-xl bg-inset p-3">
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
              <span className="truncate text-sm font-semibold">
                {player.name}
              </span>
              <SkillChip skill={player.skill} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CourtCard({
  court,
  players,
  gameMode,
  queueDepth,
  now,
  canRemove,
  dispatch,
  onEditMatch,
}: Props) {
  const needed = playersPerGame(gameMode);
  const shortBy = needed - queueDepth;

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
            <button
              onClick={onEditMatch}
              className="btn btn-icon"
              aria-label={`Edit teams for ${court.name}`}
              title="Move players between teams or swap in someone from the queue"
            >
              ✎
            </button>
          </div>
        ) : (
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
        )}
      </header>

      {court.match ? (
        <>
          <div className="flex items-stretch gap-2">
            <Team
              label="Team A"
              ids={court.match.teamA}
              players={players}
              onWin={() =>
                dispatch({ type: "endGame", courtId: court.id, winner: "A" })
              }
            />
            <span className="self-center text-xs font-bold text-muted">vs</span>
            <Team
              label="Team B"
              ids={court.match.teamB}
              players={players}
              onWin={() =>
                dispatch({ type: "endGame", courtId: court.id, winner: "B" })
              }
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                dispatch({ type: "endGame", courtId: court.id, winner: null })
              }
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
          <button
            onClick={() => dispatch({ type: "startGame", courtId: court.id })}
            className="btn btn-primary"
            disabled={court.closed || shortBy > 0}
          >
            Start next game
          </button>
        </div>
      )}
    </section>
  );
}
