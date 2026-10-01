import type { Metadata } from "next";
import { PlayerStatus } from "@/components/PlayerStatus";

export const metadata: Metadata = {
  title: "My Status — Pickleball Queue",
  description: "Live status for a checked-in player.",
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string; playerId: string }>;
}) {
  const { clubId, sessionId, playerId } = await params;
  return <PlayerStatus clubId={clubId} sessionId={sessionId} playerId={playerId} />;
}
