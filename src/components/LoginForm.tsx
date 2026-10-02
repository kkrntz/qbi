"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ needsSetup }: { needsSetup: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(needsSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "That didn't work.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-ball">●</span> Quebi
        </h1>
        <p className="mt-1 text-sm text-muted">
          {needsSetup
            ? "Set up the first admin account to get started."
            : "Sign in to manage your club."}
        </p>
      </div>

      <form onSubmit={submit} className="panel flex flex-col gap-4 p-5">
        {error && (
          <p className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="label mb-1.5 block">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            className="w-full rounded-lg border border-border bg-inset px-3 py-2.5
              text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="password" className="label mb-1.5 block">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={needsSetup ? "new-password" : "current-password"}
            minLength={needsSetup ? 8 : undefined}
            className="w-full rounded-lg border border-border bg-inset px-3 py-2.5
              text-sm text-text outline-none focus:border-accent"
          />
          {needsSetup && (
            <p className="mt-1 text-[11px] text-muted">At least 8 characters.</p>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary py-2.5"
          disabled={!email.trim() || !password || submitting}
        >
          {submitting ? "…" : needsSetup ? "Create admin account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
