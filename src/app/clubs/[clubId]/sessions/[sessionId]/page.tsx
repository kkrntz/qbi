import { notFound } from "next/navigation";
import { getClub } from "@/lib/clubStore";
import { SessionDashboard } from "@/components/SessionDashboard";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string }>;
}) {
  const { clubId, sessionId } = await params;
  const club = await getClub(clubId);
  if (!club) notFound();
  return <SessionDashboard clubId={clubId} clubName={club.name} sessionId={sessionId} />;
}
