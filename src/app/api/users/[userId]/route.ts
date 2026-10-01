import { NextResponse } from "next/server";
import { deleteUser, toPublicUser, updateUser, type UserUpdate } from "@/lib/auth";
import { readJsonBody, requireSuperAdmin, respond } from "@/lib/apiHelpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;
  const body = await readJsonBody<UserUpdate>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });

  return respond(async () => toPublicUser(await updateUser(userId, body)));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;
  return respond(async () => {
    await deleteUser(userId);
    return { ok: true };
  });
}
