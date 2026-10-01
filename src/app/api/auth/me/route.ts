import { NextResponse } from "next/server";
import { listUsers, toPublicUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const needsSetup = (await listUsers()).length === 0;
  if (!user) return NextResponse.json({ user: null, needsSetup });
  return NextResponse.json({ user: toPublicUser(user), needsSetup: false });
}
