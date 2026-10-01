"use client";

import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/types";

const ROLE_LABEL: Record<PublicUser["role"], string> = {
  super_admin: "Super admin",
  club_admin: "Club admin",
};

export function UserMenu({ user }: { user: PublicUser }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden text-muted sm:inline">
        {user.email} · {ROLE_LABEL[user.role]}
      </span>
      <button onClick={() => void logout()} className="btn text-xs">
        Sign out
      </button>
    </div>
  );
}
