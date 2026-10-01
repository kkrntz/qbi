import { NextResponse } from "next/server";
import { applyToSession } from "@/lib/clubStore";
import type { Action } from "@/lib/store";
import { readJsonBody, requireClubAccess, respond } from "@/lib/apiHelpers";

/**
 * Self check-in and the player-status page call this unauthenticated (a
 * player has no account — knowing their own /checkin or /p/[playerId] link
 * is the only "authorization" they need, same as before login existed).
 * Every other action is an operator action and requires club access.
 */
const PUBLIC_ACTION_TYPES = new Set<Action["type"]>(["checkIn", "checkOut", "setBenched"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  const action = await readJsonBody<Action>(request);
  if (!action) return NextResponse.json({ error: "Malformed request." }, { status: 400 });

  if (!PUBLIC_ACTION_TYPES.has(action.type)) {
    const auth = await requireClubAccess(clubId);
    if (auth instanceof NextResponse) return auth;
  }

  return respond(() => applyToSession(clubId, sessionId, action));
}
