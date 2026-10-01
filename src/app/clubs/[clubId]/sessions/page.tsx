import Link from "next/link";
import { notFound } from "next/navigation";
import { getClub, listSessions } from "@/lib/clubStore";
import { canManageClub } from "@/lib/permissions";
import { requirePageClubAccess } from "@/lib/pageAuth";
import { SessionHistoryList } from "@/components/SessionHistoryList";

export default async function SessionHistoryPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const user = await requirePageClubAccess(clubId);
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

      <SessionHistoryList
        clubId={clubId}
        initialSessions={sessions}
        canManage={canManageClub(user, clubId)}
      />
    </div>
  );
}
