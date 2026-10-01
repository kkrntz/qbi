"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action } from "./store";
import type { SessionState } from "./types";

const POLL_MS = 2500;

/** Shared shape for the dispatch function passed down to every component. */
export type Dispatch = (action: Action) => Promise<SessionState | false>;

/**
 * Holds the shared session, refetching on a short interval so a second screen
 * (phone at the net post, laptop at the desk) stays in step.
 */
export function useSession() {
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not reach the session.");
      setState((await res.json()) as SessionState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load session.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Resolves to the fresh session state on success (truthy, and useful to
  // callers that need it right away instead of waiting for the next
  // render), or `false` on failure.
  const dispatch = useCallback(async (action: Action): Promise<SessionState | false> => {
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "That didn't work.");
        return false;
      }
      const next = body as SessionState;
      setState(next);
      return next;
    } catch {
      setError("Lost connection to the session.");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

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
