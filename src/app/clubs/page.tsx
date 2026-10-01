import type { Metadata } from "next";
import { toPublicUser } from "@/lib/auth";
import { requirePageUser } from "@/lib/pageAuth";
import { ClubManager } from "@/components/ClubManager";

export const metadata: Metadata = {
  title: "Clubs — In-Que",
  description: "Manage clubs and their session history.",
};

export default async function ClubsPage() {
  const user = await requirePageUser();
  return <ClubManager user={toPublicUser(user)} />;
}
