import { NextResponse } from "next/server";
import { Action, apply, mutate } from "@/lib/store";

export async function POST(request: Request) {
  let action: Action;
  try {
    action = (await request.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    const state = await mutate((draft) => apply(draft, action));
    return NextResponse.json(state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
