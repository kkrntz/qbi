import type { Metadata } from "next";
import { ClubManager } from "@/components/ClubManager";

export const metadata: Metadata = {
  title: "Clubs — Pickleball Queue",
  description: "Manage clubs and their session history.",
};

export default function ClubsPage() {
  return <ClubManager />;
}
