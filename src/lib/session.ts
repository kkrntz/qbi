import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  findUserById,
  newSessionPayload,
  signSession,
  verifySession,
} from "./auth";
import type { User } from "./types";

/** Signs in `userId`/`role` by setting the session cookie. Route Handlers only. */
export async function createSessionCookie(userId: string, role: User["role"]) {
  const token = await signSession(newSessionPayload(userId, role));
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

/** Route Handlers only. */
export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolves the logged-in user from the request cookie, or `null`. Works in
 * both Server Components and Route Handlers. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = await findUserById(payload.sub);
  return user ?? null;
}
