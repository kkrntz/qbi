"use client";

import { useState } from "react";
import type { Dispatch } from "@/lib/useSession";
import type { GameMode, MatchRecord, Player } from "@/lib/types";
import { playersPerGame } from "@/lib/types";
import { nextGroup, partnerOf, recentGroups } from "@/lib/teamPicker";
import { formatWait } from "@/lib/format";
import { PartnerModal } from "./PartnerModal";
import { PlayerLinkButton } from "./PlayerLinkButton";
import { Avatar, Empty, SkillChip } from "./ui";

export function QueuePanel({
  clubId,
  sessionId,
  queue,
  players,
  history,
  gameMode,
  now,
  dispatch,
  canManage,
}: {
  clubId: string;
  sessionId: string;
  queue: string[];
  players: Map<string, Player>;
  history: MatchRecord[];
  gameMode: GameMode;
  now: number;
  dispatch: Dispatch;
  canManage: boolean;
}) {
  const needed = playersPerGame(gameMode);
  // Who the next game would actually take — not always the first few in
  // line, since pairs are called together and repeat groups are avoided.
  const upNextIds = new Set(nextGroup(queue, players, gameMode, recentGroups(history)));
  const [pairingId, setPairingId] = useState<string | null>(null);
  const pairing = pairingId ? players.get(pairingId) : undefined;

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
            const upNext = upNextIds.has(id);
            const partner = partnerOf(player, players);
            return (
              <li
                key={id}
                className={`flex flex-col gap-1.5 rounded-xl border p-2 ${
                  upNext
                    ? "border-accent/60 bg-accent-soft"
                    : "border-border bg-inset"
                }`}
              >
                <div className="flex items-center gap-2">
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
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col text-[11px] text-muted">
                    <span className="truncate">
                      waiting {formatWait(now - (player.queuedAt ?? now))} ·{" "}
                      {player.gamesPlayed} played
                    </span>
                    {partner && (
                      <span className="truncate" title={`Paired with ${partner.name}`}>
                        🤝 with {partner.name}
                      </span>
                    )}
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
                      {gameMode === "doubles" && (
                        <button
                          onClick={() => setPairingId(id)}
                          className={`btn btn-icon ${partner ? "btn-primary" : ""}`}
                          aria-label={`Choose a partner for ${player.name}`}
                          title={
                            partner
                              ? `Paired with ${partner.name} — change or unpair`
                              : "Pair with a partner"
                          }
                        >
                          🤝
                        </button>
                      )}
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
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {pairing && (
        <PartnerModal
          player={pairing}
          players={players}
          dispatch={dispatch}
          onClose={() => setPairingId(null)}
        />
      )}
    </div>
  );
}
