"use client";

import type { Dispatch } from "@/lib/useSession";
import type { MatchRecord, Player } from "@/lib/types";
import { formatClock } from "@/lib/format";
import { PlayerLinkButton } from "./PlayerLinkButton";
import { Avatar, Empty } from "./ui";

export function BenchPanel({
  clubId,
  sessionId,
  benched,
  dispatch,
  canManage,
}: {
  clubId: string;
  sessionId: string;
  benched: Player[];
  dispatch: Dispatch;
  canManage: boolean;
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
              <span
                className="min-w-0 flex-1 truncate text-sm font-semibold"
                title={player.name}
              >
                {player.name}
              </span>
              <PlayerLinkButton
                clubId={clubId}
                sessionId={sessionId}
                playerId={player.id}
                playerName={player.name}
              />
              {canManage && (
                <>
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
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Games a player needs before they're ranked, so one lucky win doesn't top the board. */
const MIN_RANKED_GAMES = 4;

const winRate = (p: Player) => p.wins / p.gamesPlayed;

export function LeaderboardPanel({ players }: { players: Player[] }) {
  // Ranked by win percentage; ties go to more wins, then more games.
  const ranked = [...players]
    .filter((p) => p.gamesPlayed >= MIN_RANKED_GAMES)
    .sort(
      (a, b) =>
        winRate(b) - winRate(a) || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed,
    )
    .slice(0, 10);

  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">
        Session leaders{" "}
        <span className="font-normal text-muted">(min {MIN_RANKED_GAMES} games)</span>
      </h2>
      {ranked.length === 0 ? (
        <Empty>Players are ranked by win % once they&apos;ve played {MIN_RANKED_GAMES} games.</Empty>
      ) : (
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="label text-left">
              <th className="pb-1 font-semibold">Player</th>
              <th className="w-12 pb-1 text-right font-semibold">Win %</th>
              <th className="w-10 pb-1 text-right font-semibold">W</th>
              <th className="w-10 pb-1 text-right font-semibold">GP</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((player) => (
              <tr key={player.id} className="border-t border-border">
                <td className="truncate py-1.5 font-medium" title={player.name}>
                  {player.name}
                </td>
                <td className="py-1.5 text-right font-mono font-semibold tabular-nums">
                  {Math.round(winRate(player) * 100)}%
                </td>
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
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 break-words [&>span]:min-w-0">
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
