"use client";

import { useState } from "react";
import { useSession } from "@/lib/useSession";
import { SKILLS, type Skill } from "@/lib/types";

export function SelfCheckIn() {
  const { state, error, dispatch, dismissError } = useSession();
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<Skill>("intermediate");
  const [submitting, setSubmitting] = useState(false);
  const [checkedIn, setCheckedIn] = useState<{ name: string; position: number | null } | null>(
    null,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const next = await dispatch({ type: "checkIn", name: trimmed, skill });
    setSubmitting(false);
    if (!next) return;

    // Best-effort: find where we landed in line. Name matching isn't a
    // stable identifier, so if two people check in with the same name at
    // the same moment this picks the most recent one.
    const mine = next.players
      .filter((p) => p.name === trimmed && p.status === "waiting")
      .sort((a, b) => b.checkedInAt - a.checkedInAt)[0];
    const position = mine ? next.queue.indexOf(mine.id) + 1 : null;

    setCheckedIn({ name: trimmed, position: position && position > 0 ? position : null });
    setName("");
  }

  if (checkedIn) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-5xl">✅</span>
        <h1 className="text-xl font-bold">You&apos;re in, {checkedIn.name}!</h1>
        <p className="text-sm text-muted">
          {checkedIn.position
            ? `You're #${checkedIn.position} in line. Watch the courts — you'll be called when it's your turn.`
            : "You've been added to the queue. Watch the courts — you'll be called when it's your turn."}
        </p>
        {state && (
          <p className="text-xs text-muted">
            {state.queue.length} waiting · {state.courts.filter((c) => c.match).length}/
            {state.courts.length} courts in play
          </p>
        )}
        <button
          onClick={() => setCheckedIn(null)}
          className="btn btn-primary mt-2 w-full max-w-xs"
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

        <div>
          <span className="label mb-1.5 block">Skill level</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Skill level">
            {SKILLS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={skill === option}
                onClick={() => setSkill(option)}
                className={`flex-1 rounded-lg border px-2 py-3 text-sm font-semibold
                  capitalize transition ${
                    skill === option
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-inset text-muted hover:text-text"
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
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
