"use client";

import { useState } from "react";
import type { Dispatch } from "@/lib/useSession";

export function CheckInForm({
  dispatch,
}: {
  dispatch: Dispatch;
}) {
  const [name, setName] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const ok = await dispatch({ type: "checkIn", name });
    if (ok) setName("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Player name"
        aria-label="Player name"
        className="w-full rounded-lg border border-border bg-inset px-3 py-2.5
          text-sm text-text outline-none placeholder:text-muted
          focus:border-accent"
      />
      <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
        Add to queue
      </button>
    </form>
  );
}
