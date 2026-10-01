"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewSessionForm({ clubId }: { clubId: string }) {
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not start the session.");
      router.push(`/clubs/${clubId}/sessions/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the session.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-3 p-4">
      <div>
        <label htmlFor="session-label" className="label mb-1.5 block">
          Session name
        </label>
        <input
          id="session-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Tuesday Open Play"
          autoFocus
          className="w-full rounded-lg border border-border bg-inset px-3 py-2
            text-sm text-text outline-none placeholder:text-muted
            focus:border-accent"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Starting…" : "Start session"}
      </button>
    </form>
  );
}
