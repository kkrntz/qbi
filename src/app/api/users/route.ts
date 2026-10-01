import { NextResponse } from "next/server";
import { createUser, listUsers, toPublicUser } from "@/lib/auth";
import { readJsonBody, requireSuperAdmin, respond } from "@/lib/apiHelpers";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;
  return respond(async () => (await listUsers()).map(toPublicUser));
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonBody<{
    email: string;
    password: string;
    role: Role;
    clubIds: string[];
  }>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });

  return respond(async () =>
    toPublicUser(
      await createUser(body.email, body.password, body.role, body.clubIds ?? []),
    ),
  );
}
