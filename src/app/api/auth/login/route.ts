import { NextResponse } from "next/server";
import { toPublicUser, verifyLogin } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { readJsonBody } from "@/lib/apiHelpers";

export async function POST(request: Request) {
  const body = await readJsonBody<{ email: string; password: string }>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });

  const user = await verifyLogin(body.email, body.password);
  if (!user) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  await createSessionCookie(user.id, user.role);
  return NextResponse.json(toPublicUser(user));
}
