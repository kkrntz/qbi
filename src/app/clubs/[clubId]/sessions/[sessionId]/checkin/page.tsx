import type { Metadata } from "next";
import { SelfCheckIn } from "@/components/SelfCheckIn";

export const metadata: Metadata = {
  title: "Check In — Pickleball Queue",
  description: "Add yourself to the pickleball queue.",
};

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string }>;
}) {
  const { clubId, sessionId } = await params;
  return <SelfCheckIn clubId={clubId} sessionId={sessionId} />;
}
