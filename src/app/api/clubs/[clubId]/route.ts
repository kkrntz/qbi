import { NextResponse } from "next/server";
import { deleteClub, getClub, renameClub } from "@/lib/clubStore";
import { readJsonBody, respond } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const { clubId } = await params;
  const club = await getClub(clubId);
  if (!club) return NextResponse.json({ error: "That club no longer exists." }, { status: 404 });
  return NextResponse.json(club);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const { clubId } = await params;
  const body = await readJsonBody<{ name: string }>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  return respond(() => renameClub(clubId, body.name));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const { clubId } = await params;
  return respond(async () => {
    await deleteClub(clubId);
    return { ok: true };
  });
}
