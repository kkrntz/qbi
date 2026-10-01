import { redirect } from "next/navigation";
import { canAccessClub, canManageClub } from "./permissions";
import { getCurrentUser } from "./session";
import type { User } from "./types";

/** For Server Component pages: redirects to /login if not signed in. */
export async function requirePageUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** View access: signed in and either super_admin or a club_admin for
 * `clubId`; otherwise redirects to /login (not signed in) or /dashboard
 * (signed in, wrong club). */
export async function requirePageClubAccess(clubId: string): Promise<User> {
  const user = await requirePageUser();
  if (!canAccessClub(user, clubId)) redirect("/dashboard");
  return user;
}

/** Manage access: signed in and a club_admin for `clubId` — a super admin
 * does NOT qualify, since they can view every club's live sessions but not
 * run them. Use for pages that create/end a session or otherwise drive
 * gameplay, not for the read-only session dashboard itself. */
export async function requirePageClubManager(clubId: string): Promise<User> {
  const user = await requirePageUser();
  if (!canManageClub(user, clubId)) redirect("/dashboard");
  return user;
}

export async function requirePageSuperAdmin(): Promise<User> {
  const user = await requirePageUser();
  if (user.role !== "super_admin") redirect("/dashboard");
  return user;
}
