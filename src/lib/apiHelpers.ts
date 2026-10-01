import { NextResponse } from "next/server";

/**
 * Runs `fn`, returning its resolved value as a 200 JSON response, or a 400
 * with `{ error: message }` if it throws — the shape every route handler in
 * this app uses for validation errors raised by the reducer or club store.
 */
export async function respond<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Parses a JSON request body, returning `null` (caller sends 400) if malformed. */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
