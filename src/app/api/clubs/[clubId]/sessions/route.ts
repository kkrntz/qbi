import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/clubStore";
import { readJsonBody, requireClubAccess, respond } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const { clubId } = await params;
  const auth = await requireClubAccess(clubId);
  if (auth instanceof NextResponse) return auth;
  return respond(() => listSessions(clubId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const { clubId } = await params;
  const auth = await requireClubAccess(clubId);
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonBody<{ label: string }>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  return respond(() => createSession(clubId, body.label));
}
