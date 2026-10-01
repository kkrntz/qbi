import { NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/clubStore";
import { requireClubManager, respond } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

// Intentionally public (no auth check): both the operator dashboard and the
// public self check-in / player-status pages poll this to read live state.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  const session = await getSession(clubId, sessionId);
  if (!session)
    return NextResponse.json({ error: "That session no longer exists." }, { status: 404 });
  return NextResponse.json(session);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  const auth = await requireClubManager(clubId);
  if (auth instanceof NextResponse) return auth;
  return respond(async () => {
    await deleteSession(clubId, sessionId);
    return { ok: true };
  });
}
