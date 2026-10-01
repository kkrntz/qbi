import { NextResponse } from "next/server";
import { canAccessClub } from "./auth";
import { getCurrentUser } from "./session";
import type { User } from "./types";

/**
 * Runs `fn`, returning its resolved value as a 200 JSON response, or a 400
 * with `{ error: message }` if it throws — the shape every route handler in
 * this app uses for validation errors raised by the reducer or club store.
 */
export async function respond<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Parses a JSON request body, returning `null` (caller sends 400) if malformed. */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

const UNAUTHENTICATED = NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
const FORBIDDEN = NextResponse.json(
  { error: "You don't have access to this club." },
  { status: 403 },
);
const SUPER_ADMIN_ONLY = NextResponse.json(
  { error: "Only a super admin can do that." },
  { status: 403 },
);

/**
 * Resolves the logged-in user, or returns the `NextResponse` the caller
 * should return as-is. Usage: `const user = await requireUser(); if (user
 * instanceof NextResponse) return user;`
 */
export async function requireUser(): Promise<User | NextResponse> {
  const user = await getCurrentUser();
  return user ?? UNAUTHENTICATED;
}

export async function requireSuperAdmin(): Promise<User | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return user.role === "super_admin" ? user : SUPER_ADMIN_ONLY;
}

/** Super admin, or a club admin whose `clubIds` includes `clubId`. */
export async function requireClubAccess(clubId: string): Promise<User | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return canAccessClub(user, clubId) ? user : FORBIDDEN;
}
