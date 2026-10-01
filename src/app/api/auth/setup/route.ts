import { NextResponse } from "next/server";
import { createUser, listUsers, toPublicUser } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { readJsonBody } from "@/lib/apiHelpers";

/**
 * One-time bootstrap: creates the first user (always `super_admin`) and
 * signs them in. Refuses once any user already exists — after that, new
 * accounts are created by an existing super admin via /api/users.
 */
export async function POST(request: Request) {
  const existing = await listUsers();
  if (existing.length > 0)
    return NextResponse.json({ error: "Setup has already run." }, { status: 400 });

  const body = await readJsonBody<{ email: string; password: string }>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });

  try {
    const user = await createUser(body.email, body.password, "super_admin", []);
    await createSessionCookie(user.id, user.role);
    return NextResponse.json(toPublicUser(user));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
