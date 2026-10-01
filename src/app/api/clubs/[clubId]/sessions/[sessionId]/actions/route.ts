import { NextResponse } from "next/server";
import { applyToSession } from "@/lib/clubStore";
import type { Action } from "@/lib/store";
import { readJsonBody, respond } from "@/lib/apiHelpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  const action = await readJsonBody<Action>(request);
  if (!action) return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  return respond(() => applyToSession(clubId, sessionId, action));
}
