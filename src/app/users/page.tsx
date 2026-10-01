import type { Metadata } from "next";
import { toPublicUser } from "@/lib/auth";
import { requirePageSuperAdmin } from "@/lib/pageAuth";
import { UsersManager } from "@/components/UsersManager";

export const metadata: Metadata = {
  title: "Users — In-Que",
  description: "Manage admin accounts and which clubs they run.",
};

export default async function UsersPage() {
  const user = await requirePageSuperAdmin();
  return <UsersManager currentUser={toPublicUser(user)} />;
}
