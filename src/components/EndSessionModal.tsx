"use client";

import { useState } from "react";
import type { Session } from "@/lib/types";
import { buildSessionExport, downloadJson, sessionFileName } from "@/lib/sessionExport";

export function EndSessionModal({
  state,
  onClose,
  onEnded,
}: {
  state: Session;
  onClose: () => void;
  onEnded: () => void;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveCourts = state.courts.filter((c) => c.match).length;
  const durationMinutes = Math.max(0, Math.round((Date.now() - state.startedAt) / 60000));

  function download() {
    downloadJson(sessionFileName(state), buildSessionExport(state));
    setDownloaded(true);
  }

  async function endSession() {
    setEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${state.clubId}/sessions/${state.id}/end`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not end the session.");
      onEnded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end the session.");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="End session"
    >
      <div
        className="panel flex w-full max-w-md flex-col gap-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">
              End {state.label || "this session"}?
            </h2>
            <p className="text-xs text-muted">
              It becomes read-only history — download a record of it first if
              you want one.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-icon" aria-label="Close">
            ×
          </button>
        </header>

        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-inset p-3 text-sm">
          <div>
            <dt className="label">Duration</dt>
            <dd className="font-semibold">
              {durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                : `${durationMinutes}m`}
            </dd>
          </div>
          <div>
            <dt className="label">Players</dt>
            <dd className="font-semibold">{state.players.length}</dd>
          </div>
          <div>
            <dt className="label">Games played</dt>
            <dd className="font-semibold">{state.history.length}</dd>
          </div>
          <div>
            <dt className="label">Courts</dt>
            <dd className="font-semibold">{state.courts.length}</dd>
          </div>
        </dl>

        {liveCourts > 0 && (
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">
            {liveCourts} court{liveCourts > 1 ? "s" : ""} still{" "}
            {liveCourts > 1 ? "have" : "has"} a game in progress — ending now
            discards it without recording a result.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <button onClick={download} className="btn w-full">
          {downloaded ? "Downloaded ✓ — download again" : "Download session data"}
        </button>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn flex-1">
            Cancel
          </button>
          <button
            onClick={endSession}
            className="btn btn-danger flex-1"
            disabled={ending}
          >
            {ending ? "Ending…" : "End session"}
          </button>
        </div>
      </div>
    </div>
  );
}
