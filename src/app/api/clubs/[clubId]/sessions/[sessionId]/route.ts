import { NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/clubStore";
import { respond } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

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
  return respond(async () => {
    await deleteSession(clubId, sessionId);
    return { ok: true };
  });
}
