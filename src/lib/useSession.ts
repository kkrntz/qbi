"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action } from "./store";
import type { Session } from "./types";

const POLL_MS = 2500;

/** Shared shape for the dispatch function passed down to every component. */
export type Dispatch = (action: Action) => Promise<Session | false>;

/**
 * Holds one club's session (its live game data plus id/clubId/endedAt),
 * refetching on a short interval so a second screen (phone at the net post,
 * laptop at the desk) stays in step. Dispatching against an ended session
 * fails with a clear error — the API enforces that, this just surfaces it.
 */
export function useSession(clubId: string, sessionId: string) {
  const [state, setState] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    try {
      const res = await fetch(`/api/clubs/${clubId}/sessions/${sessionId}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not reach the session.");
      setState(body as Session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load session.");
    }
  }, [clubId, sessionId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Resolves to the fresh session on success (truthy, and useful to callers
  // that need it right away instead of waiting for the next render), or
  // `false` on failure.
  const dispatch = useCallback<Dispatch>(
    async (action) => {
      busyRef.current = true;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/clubs/${clubId}/sessions/${sessionId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const body = await res.json();
        if (!res.ok) {
          setError(body?.error ?? "That didn't work.");
          return false;
        }
        const next = body as Session;
        setState(next);
        return next;
      } catch {
        setError("Lost connection to the session.");
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [clubId, sessionId],
  );

  return { state, error, busy, dispatch, dismissError: () => setError(null) };
}

/** Re-renders once a second so live timers tick without touching the server. */
export function useTicker() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
