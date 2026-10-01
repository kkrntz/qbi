import { NextResponse } from "next/server";
import { endSession } from "@/lib/clubStore";
import { requireClubManager, respond } from "@/lib/apiHelpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  const auth = await requireClubManager(clubId);
  if (auth instanceof NextResponse) return auth;
  return respond(() => endSession(clubId, sessionId));
}
