"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "@/lib/types";

export function SessionHistoryList({
  clubId,
  initialSessions,
}: {
  clubId: string;
  initialSessions: Session[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function removeSession(session: Session) {
    const warning =
      session.endedAt === null
        ? `"${session.label || "Untitled session"}" is still active — deleting it discards all of its data right now. This can't be undone. Delete it anyway?`
        : `Permanently delete "${session.label || "Untitled session"}"? This can't be undone.`;
    if (!confirm(warning)) return;

    setDeletingId(session.id);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/sessions/${session.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not delete the session.");
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the session.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border
            border-danger/40 bg-danger-soft px-4 py-2.5 text-sm text-danger"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-muted">No sessions yet.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id} className="panel flex items-center gap-2 p-3">
              <Link
                href={`/clubs/${clubId}/sessions/${session.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 hover:text-accent"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {session.label || "Untitled session"}
                    </span>
                    {session.endedAt === null && (
                      <span className="chip bg-ball text-ball-ink">live</span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(session.startedAt).toLocaleString()}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {session.players.length} players · {session.history.length} games
                </span>
              </Link>
              <button
                onClick={() => removeSession(session)}
                className="btn btn-icon btn-danger shrink-0"
                aria-label={`Delete ${session.label || "Untitled session"}`}
                title="Delete session"
                disabled={deletingId === session.id}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
