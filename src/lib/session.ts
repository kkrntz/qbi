import { cookies, headers } from "next/headers";
import {
  SESSION_COOKIE,
  findUserById,
  newSessionPayload,
  signSession,
  verifySession,
} from "./auth";
import type { User } from "./types";

/** Whether this request reached us over HTTPS. Next fills in
 * x-forwarded-proto itself (or keeps a reverse proxy's), so this holds both
 * behind a TLS-terminating proxy and when served directly. */
async function isHttpsRequest(): Promise<boolean> {
  const proto = (await headers()).get("x-forwarded-proto") ?? "";
  return proto.split(",")[0].trim() === "https";
}

/** Signs in `userId`/`role` by setting the session cookie. Route Handlers only. */
export async function createSessionCookie(userId: string, role: User["role"]) {
  const token = await signSession(newSessionPayload(userId, role));
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Keyed to the actual protocol, not NODE_ENV: a production build served
    // over plain http on the LAN (phones at the courts) would otherwise get a
    // Secure cookie the browser silently drops, so login never sticks.
    secure: await isHttpsRequest(),
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
