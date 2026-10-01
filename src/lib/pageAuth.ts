import { redirect } from "next/navigation";
import { canAccessClub } from "./auth";
import { getCurrentUser } from "./session";
import type { User } from "./types";

/** For Server Component pages: redirects to /login if not signed in. */
export async function requirePageUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed in and either super_admin or a club_admin for `clubId`; otherwise
 * redirects to /login (not signed in) or /clubs (signed in, wrong club). */
export async function requirePageClubAccess(clubId: string): Promise<User> {
  const user = await requirePageUser();
  if (!canAccessClub(user, clubId)) redirect("/clubs");
  return user;
}

export async function requirePageSuperAdmin(): Promise<User> {
  const user = await requirePageUser();
  if (user.role !== "super_admin") redirect("/clubs");
  return user;
}
