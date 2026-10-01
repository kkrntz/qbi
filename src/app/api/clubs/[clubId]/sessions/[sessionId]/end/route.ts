import { NextResponse } from "next/server";
import { endSession } from "@/lib/clubStore";
import { requireClubAccess, respond } from "@/lib/apiHelpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  const auth = await requireClubAccess(clubId);
  if (auth instanceof NextResponse) return auth;
  return respond(() => endSession(clubId, sessionId));
}
