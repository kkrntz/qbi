"use client";

import type { Dispatch } from "@/lib/useSession";
import type { GameMode, Player } from "@/lib/types";
import { playersPerGame } from "@/lib/types";
import { formatWait } from "@/lib/format";
import { PlayerLinkButton } from "./PlayerLinkButton";
import { Avatar, Empty, SkillChip } from "./ui";

export function QueuePanel({
  clubId,
  sessionId,
  queue,
  players,
  gameMode,
  now,
  dispatch,
  canManage,
}: {
  clubId: string;
  sessionId: string;
  queue: string[];
  players: Map<string, Player>;
  gameMode: GameMode;
  now: number;
  dispatch: Dispatch;
  canManage: boolean;
}) {
  const needed = playersPerGame(gameMode);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-bold">Queue</h2>
        <span className="text-xs text-muted">
          {queue.length} waiting
          {queue.length >= needed ? " · next group ready" : ""}
        </span>
      </div>

      {queue.length === 0 ? (
        <Empty>Nobody waiting. Check a player in to get started.</Empty>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {queue.map((id, index) => {
            const player = players.get(id);
            if (!player) return null;
            const upNext = index < needed;
            return (
              <li
                key={id}
                className={`flex items-center gap-2 rounded-xl border p-2 ${
                  upNext
                    ? "border-accent/60 bg-accent-soft"
                    : "border-border bg-inset"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center
                    rounded-full text-xs font-bold ${
                      upNext
                        ? "bg-accent text-accent-ink"
                        : "bg-panel text-muted"
                    }`}
                >
                  {index + 1}
                </span>
                <Avatar player={player} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {player.name}
                    </span>
                    <SkillChip skill={player.skill} />
                    <PlayerLinkButton
                      clubId={clubId}
                      sessionId={sessionId}
                      playerId={id}
                      playerName={player.name}
                    />
                  </div>
                  <span className="text-[11px] text-muted">
                    waiting {formatWait(now - (player.queuedAt ?? now))} ·{" "}
                    {player.gamesPlayed} played
                  </span>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() =>
                        dispatch({
                          type: "moveInQueue",
                          playerId: id,
                          direction: "up",
                        })
                      }
                      disabled={index === 0}
                      className="btn btn-icon"
                      aria-label={`Move ${player.name} up`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() =>
                        dispatch({
                          type: "moveInQueue",
                          playerId: id,
                          direction: "down",
                        })
                      }
                      disabled={index === queue.length - 1}
                      className="btn btn-icon"
                      aria-label={`Move ${player.name} down`}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() =>
                        dispatch({
                          type: "setBenched",
                          playerId: id,
                          benched: true,
                        })
                      }
                      className="btn btn-icon"
                      aria-label={`Bench ${player.name}`}
                      title="Sit out"
                    >
                      ⏸
                    </button>
                    <button
                      onClick={() => dispatch({ type: "checkOut", playerId: id })}
                      className="btn btn-icon btn-danger"
                      aria-label={`Check out ${player.name}`}
                      title="Check out"
                    >
                      ×
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
