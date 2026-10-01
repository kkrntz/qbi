import type { Role } from "./types";

type RoleAndClubs = { role: Role; clubIds: string[] };

/**
 * Can view this club (its pages, its session history, a live session's
 * read-only state): super admins see every club; club admins see only the
 * clubs assigned to them.
 */
export function canAccessClub(user: RoleAndClubs, clubId: string): boolean {
  return user.role === "super_admin" || user.clubIds.includes(clubId);
}

/**
 * Can manage this club's live sessions — create one, run in-game actions,
 * end it, delete it. Deliberately excludes super_admin: that role is for
 * club/user administration and cross-club oversight, not driving another
 * club's day-to-day gameplay. Only a club admin assigned to this specific
 * club can do that.
 */
export function canManageClub(user: RoleAndClubs, clubId: string): boolean {
  return user.role === "club_admin" && user.clubIds.includes(clubId);
}
