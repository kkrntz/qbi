import type { Metadata } from "next";
import { PlayerStatus } from "@/components/PlayerStatus";

export const metadata: Metadata = {
  title: "My Status — Pickleball Queue",
  description: "Live status for a checked-in player.",
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlayerStatus playerId={id} />;
}
