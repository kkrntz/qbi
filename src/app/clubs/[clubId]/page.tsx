import Link from "next/link";
import { notFound } from "next/navigation";
import { getClub, listSessions } from "@/lib/clubStore";
import { toPublicUser } from "@/lib/auth";
import { requirePageClubAccess } from "@/lib/pageAuth";
import { NewSessionForm } from "@/components/NewSessionForm";
import { UserMenu } from "@/components/UserMenu";

export default async function ClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const user = await requirePageClubAccess(clubId);
  const club = await getClub(clubId);
  if (!club) notFound();

  const sessions = await listSessions(clubId);
  const active = sessions.find((s) => s.endedAt === null);
  const ended = sessions.filter((s) => s.endedAt !== null).slice(0, 5);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/clubs" className="text-xs font-medium text-muted hover:text-accent hover:underline">
            ← All clubs
          </Link>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-ball">●</span> {club.name}
          </h1>
        </div>
        <UserMenu user={toPublicUser(user)} />
      </div>

      {active ? (
        <Link
          href={`/clubs/${clubId}/sessions/${active.id}`}
          className="panel flex items-center justify-between gap-2 border-accent/60
            bg-accent-soft p-4 hover:border-accent"
        >
          <div>
            <p className="label">Active session</p>
            <p className="text-base font-bold">{active.label || "Untitled session"}</p>
          </div>
          <span className="chip bg-ball text-ball-ink">live →</span>
        </Link>
      ) : (
        <NewSessionForm clubId={clubId} />
      )}

      <div className="panel p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">Session history</h2>
          <Link
            href={`/clubs/${clubId}/sessions`}
            className="text-xs font-medium text-accent hover:underline"
          >
            View all ({sessions.filter((s) => s.endedAt !== null).length}) →
          </Link>
        </div>
        {ended.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            No sessions have ended yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {ended.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/clubs/${clubId}/sessions/${session.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl
                    border border-border p-2.5 text-sm hover:border-accent"
                >
                  <span className="truncate font-medium">
                    {session.label || "Untitled session"}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(session.startedAt).toLocaleDateString()} ·{" "}
                    {session.history.length} games
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
