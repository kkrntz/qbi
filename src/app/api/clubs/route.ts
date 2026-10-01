import { createClub, listClubs } from "@/lib/clubStore";
import { readJsonBody, requireSuperAdmin, requireUser, respond } from "@/lib/apiHelpers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  return respond(async () => {
    const clubs = await listClubs();
    return user.role === "super_admin" ? clubs : clubs.filter((c) => user.clubIds.includes(c.id));
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonBody<{ name: string }>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  return respond(() => createClub(body.name));
}
