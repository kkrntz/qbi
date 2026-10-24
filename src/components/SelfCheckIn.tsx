"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";

export function SelfCheckIn({
  clubId,
  sessionId,
}: {
  clubId: string;
  sessionId: string;
}) {
  const { state, error, dispatch, dismissError } = useSession(clubId, sessionId);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkedIn, setCheckedIn] = useState<{
    id: string | null;
    name: string;
  } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const next = await dispatch({ type: "checkIn", name: trimmed });
    setSubmitting(false);
    if (!next) return;

    // Best-effort: find our own player, for the status-page link. Name
    // matching isn't a stable identifier, so if two people check in with
    // the same name at the same moment this picks the most recent one.
    const mine = next.players
      .filter((p) => p.name === trimmed && p.status === "waiting")
      .sort((a, b) => b.checkedInAt - a.checkedInAt)[0];

    setCheckedIn({ id: mine?.id ?? null, name: trimmed });
    setName("");
  }

  if (state && state.endedAt !== null) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-4xl">🏁</span>
        <h1 className="text-xl font-bold">This session has ended</h1>
        <p className="text-sm text-muted">
          Check-in is closed. Ask an operator for the link to a new session.
        </p>
      </div>
    );
  }

  if (checkedIn) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-5xl">✅</span>
        <h1 className="text-xl font-bold">You&apos;re in, {checkedIn.name}!</h1>
        <p className="text-sm text-muted">
          You&apos;ve been added to the queue. Watch the courts — you&apos;ll be called
          when it&apos;s your turn.
        </p>
        {state && (
          <p className="text-xs text-muted">
            {state.queue.length} waiting · {state.courts.filter((c) => c.match).length}/
            {state.courts.length} courts in play
          </p>
        )}
        {checkedIn.id && (
          <Link
            href={`/clubs/${clubId}/sessions/${sessionId}/p/${checkedIn.id}`}
            className="btn btn-primary mt-2 w-full max-w-xs"
          >
            View my status
          </Link>
        )}
        <button
          onClick={() => setCheckedIn(null)}
          className="btn w-full max-w-xs"
        >
          Check in another player
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-ball">●</span> Join the Queue
        </h1>
        {state && (
          <p className="mt-1 text-sm text-muted">
            {state.queue.length} waiting · {state.courts.filter((c) => c.match).length}/
            {state.courts.length} courts in play
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border
            border-danger/40 bg-danger-soft px-4 py-2.5 text-sm text-danger"
        >
          <span>{error}</span>
          <button onClick={dismissError} className="font-bold" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <form onSubmit={submit} className="panel flex flex-col gap-4 p-5">
        <div>
          <label htmlFor="name" className="label mb-1.5 block">
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ana"
            autoComplete="name"
            autoFocus
            className="w-full rounded-lg border border-border bg-inset px-4 py-3
              text-base text-text outline-none placeholder:text-muted
              focus:border-accent"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary py-3 text-base"
          disabled={!name.trim() || submitting}
        >
          {submitting ? "Checking in…" : "Check in"}
        </button>
      </form>
    </div>
  );
}
