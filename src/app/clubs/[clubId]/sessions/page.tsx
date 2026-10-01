import Link from "next/link";
import { notFound } from "next/navigation";
import { getClub, listSessions } from "@/lib/clubStore";

export default async function SessionHistoryPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const club = await getClub(clubId);
  if (!club) notFound();

  const sessions = await listSessions(clubId);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 sm:p-6">
      <div>
        <Link
          href={`/clubs/${clubId}`}
          className="text-xs font-medium text-muted hover:text-accent hover:underline"
        >
          ← {club.name}
        </Link>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Session history
        </h1>
        <p className="text-xs text-muted">{sessions.length} total</p>
      </div>

      {sessions.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-muted">
          No sessions yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/clubs/${clubId}/sessions/${session.id}`}
                className="panel flex items-center justify-between gap-3 p-3 hover:border-accent"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {session.label || "Untitled session"}
                    </span>
                    {session.endedAt === null && (
                      <span className="chip bg-ball text-ball-ink">live</span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(session.startedAt).toLocaleString()}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {session.players.length} players · {session.history.length} games
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
