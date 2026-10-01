import Link from "next/link";
import type { PlatformReport } from "@/lib/types";

function formatRelative(ms: number | null): string {
  if (ms === null) return "never";
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

/**
 * The stat tiles / per-club table / recent-activity feed shared by the
 * super-admin dashboard (every club) and the club-admin one (just their
 * clubs) — `report` is already scoped by the caller, this just renders it.
 * `adminsTile` is omitted entirely for a club admin: they don't manage
 * users, so a user-count stat would be both irrelevant and something they
 * have no page to drill into.
 */
export function PlatformReportView({
  report,
  adminsTile,
  emptyClubsMessage,
}: {
  report: PlatformReport;
  adminsTile?: { total: number; superAdminCount: number; clubAdminCount: number };
  emptyClubsMessage: React.ReactNode;
}) {
  return (
    <>
      <dl className="panel grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="label">Clubs</dt>
          <dd className="text-2xl font-bold">{report.clubCount}</dd>
        </div>
        <div>
          <dt className="label">Live right now</dt>
          <dd className="text-2xl font-bold">
            {report.activeSessionCount}
            {report.clubCount > 0 && (
              <span className="text-sm font-normal text-muted"> / {report.clubCount}</span>
            )}
          </dd>
        </div>
        {adminsTile && (
          <div>
            <dt className="label">Admins</dt>
            <dd className="text-2xl font-bold">
              {adminsTile.total}
              <span className="text-sm font-normal text-muted">
                {" "}
                ({adminsTile.superAdminCount} super, {adminsTile.clubAdminCount} club)
              </span>
            </dd>
          </div>
        )}
        <div>
          <dt className="label">Sessions (all time)</dt>
          <dd className="text-2xl font-bold">{report.totalSessions}</dd>
        </div>
        <div>
          <dt className="label">Games played</dt>
          <dd className="text-2xl font-bold">{report.totalGames}</dd>
        </div>
        <div>
          <dt className="label">Check-ins</dt>
          <dd className="text-2xl font-bold">{report.totalCheckIns}</dd>
        </div>
      </dl>

      <div className="panel p-4">
        <h2 className="mb-3 text-sm font-bold">Clubs</h2>
        {report.clubs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{emptyClubsMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label text-left">
                  <th className="pb-1.5 font-semibold">Club</th>
                  <th className="pb-1.5 font-semibold">Status</th>
                  <th className="pb-1.5 text-right font-semibold">Sessions</th>
                  <th className="pb-1.5 text-right font-semibold">Games</th>
                  <th className="pb-1.5 text-right font-semibold">Check-ins</th>
                  <th className="pb-1.5 text-right font-semibold">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {report.clubs.map((club) => (
                  <tr key={club.clubId} className="border-t border-border">
                    <td className="py-1.5">
                      <Link
                        href={`/clubs/${club.clubId}`}
                        className="font-medium hover:text-accent hover:underline"
                      >
                        {club.clubName}
                      </Link>
                    </td>
                    <td className="py-1.5">
                      {club.activeSession ? (
                        <Link
                          href={`/clubs/${club.clubId}/sessions/${club.activeSession.id}`}
                          className="chip bg-ball text-ball-ink hover:brightness-105"
                        >
                          live
                        </Link>
                      ) : (
                        <span className="chip bg-inset text-muted">idle</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {club.totalSessions}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {club.totalGames}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {club.totalCheckIns}
                    </td>
                    <td className="py-1.5 text-right text-xs text-muted">
                      {formatRelative(club.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel p-4">
        <h2 className="mb-3 text-sm font-bold">Recent activity</h2>
        {report.recentSessions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No sessions yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {report.recentSessions.map((session) => (
              <li key={session.sessionId}>
                <Link
                  href={`/clubs/${session.clubId}/sessions/${session.sessionId}`}
                  className="flex items-center justify-between gap-3 rounded-xl
                    border border-border p-2.5 text-sm hover:border-accent"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">
                        {session.label || "Untitled session"}
                      </span>
                      {session.endedAt === null && (
                        <span className="chip bg-ball text-ball-ink">live</span>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {session.clubName} · {formatRelative(session.startedAt)}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {session.checkIns} players · {session.games} games
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
