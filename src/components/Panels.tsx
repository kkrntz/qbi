"use client";

import type { Dispatch } from "@/lib/useSession";
import type { MatchRecord, Player } from "@/lib/types";
import { formatClock } from "@/lib/format";
import { PlayerLinkButton } from "./PlayerLinkButton";
import { Avatar, Empty, SkillChip } from "./ui";

export function BenchPanel({
  clubId,
  sessionId,
  benched,
  dispatch,
}: {
  clubId: string;
  sessionId: string;
  benched: Player[];
  dispatch: Dispatch;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">
        Sitting out{" "}
        <span className="font-normal text-muted">({benched.length})</span>
      </h2>
      {benched.length === 0 ? (
        <Empty>Everyone checked in is in the rotation.</Empty>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {benched.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-2 rounded-xl border border-border
                bg-inset p-2"
            >
              <Avatar player={player} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {player.name}
              </span>
              <SkillChip skill={player.skill} />
              <PlayerLinkButton
                clubId={clubId}
                sessionId={sessionId}
                playerId={player.id}
                playerName={player.name}
              />
              <button
                onClick={() =>
                  dispatch({
                    type: "setBenched",
                    playerId: player.id,
                    benched: false,
                  })
                }
                className="btn px-2 py-1 text-xs"
              >
                Rejoin
              </button>
              <button
                onClick={() =>
                  dispatch({ type: "checkOut", playerId: player.id })
                }
                className="btn btn-icon btn-danger"
                aria-label={`Check out ${player.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeaderboardPanel({ players }: { players: Player[] }) {
  const ranked = [...players]
    .filter((p) => p.gamesPlayed > 0)
    .sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed)
    .slice(0, 10);

  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">Session leaders</h2>
      {ranked.length === 0 ? (
        <Empty>No games finished yet.</Empty>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="label text-left">
              <th className="pb-1 font-semibold">Player</th>
              <th className="pb-1 text-right font-semibold">W</th>
              <th className="pb-1 text-right font-semibold">GP</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((player) => (
              <tr key={player.id} className="border-t border-border">
                <td className="truncate py-1.5 font-medium">{player.name}</td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {player.wins}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-muted">
                  {player.gamesPlayed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function HistoryPanel({
  history,
  players,
}: {
  history: MatchRecord[];
  players: Map<string, Player>;
}) {
  const names = (ids: string[]) =>
    ids.map((id) => players.get(id)?.name ?? "—").join(" & ");

  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">Recent games</h2>
      {history.length === 0 ? (
        <Empty>Finished games show up here.</Empty>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {history.slice(0, 8).map((record) => (
            <li
              key={record.id}
              className="rounded-xl border border-border bg-inset px-3 py-2 text-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted">
                  {record.courtName}
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {formatClock(record.endedAt - record.startedAt)}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={
                    record.winner === "A" ? "font-bold text-accent" : undefined
                  }
                >
                  {names(record.teamA)}
                </span>
                <span className="text-xs text-muted">vs</span>
                <span
                  className={
                    record.winner === "B" ? "font-bold text-accent" : undefined
                  }
                >
                  {names(record.teamB)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
