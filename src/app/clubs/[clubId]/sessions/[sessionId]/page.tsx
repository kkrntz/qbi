import { notFound } from "next/navigation";
import { getClub } from "@/lib/clubStore";
import { toPublicUser } from "@/lib/auth";
import { canManageClub } from "@/lib/permissions";
import { requirePageClubAccess } from "@/lib/pageAuth";
import { SessionDashboard } from "@/components/SessionDashboard";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string }>;
}) {
  const { clubId, sessionId } = await params;
  // View access only — a super admin can watch a session live but a club
  // admin for this specific club is the one who can actually run it.
  const user = await requirePageClubAccess(clubId);
  const club = await getClub(clubId);
  if (!club) notFound();
  return (
    <SessionDashboard
      clubId={clubId}
      clubName={club.name}
      sessionId={sessionId}
      user={toPublicUser(user)}
      canManage={canManageClub(user, clubId)}
    />
  );
}
