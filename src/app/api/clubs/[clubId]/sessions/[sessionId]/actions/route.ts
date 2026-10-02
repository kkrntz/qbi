import { NextResponse } from "next/server";
import { applyToSession } from "@/lib/clubStore";
import type { Action } from "@/lib/store";
import { readJsonBody, requireClubManager, respond } from "@/lib/apiHelpers";

/**
 * Self check-in and the player-status page call this unauthenticated (a
 * player has no account — knowing their own /checkin or /p/[playerId] link
 * is the only "authorization" they need, same as before login existed).
 * Every other action drives gameplay and requires a club manager — a super
 * admin can view a live session but not run it, so requireClubManager (not
 * requireClubAccess) is deliberate here.
 */
const PUBLIC_ACTION_TYPES = new Set<Action["type"]>([
  "checkIn",
  "checkOut",
  "setBenched",
  "choosePartner",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  const action = await readJsonBody<Action>(request);
  if (!action) return NextResponse.json({ error: "Malformed request." }, { status: 400 });

  if (!PUBLIC_ACTION_TYPES.has(action.type)) {
    const auth = await requireClubManager(clubId);
    if (auth instanceof NextResponse) return auth;
  }

  return respond(() => applyToSession(clubId, sessionId, action));
}
