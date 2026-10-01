import { NextResponse } from "next/server";
import { deleteUser } from "@/lib/auth";
import { requireSuperAdmin, respond } from "@/lib/apiHelpers";

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
