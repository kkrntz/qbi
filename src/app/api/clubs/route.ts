import { createClub, listClubs } from "@/lib/clubStore";
import { readJsonBody, respond } from "@/lib/apiHelpers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return respond(() => listClubs());
}

export async function POST(request: Request) {
  const body = await readJsonBody<{ name: string }>(request);
  if (!body) return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  return respond(() => createClub(body.name));
}
