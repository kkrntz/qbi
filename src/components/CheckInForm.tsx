"use client";

import { useState } from "react";
import type { Action } from "@/lib/store";
import { SKILLS, type Skill } from "@/lib/types";

export function CheckInForm({
  dispatch,
}: {
  dispatch: (action: Action) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<Skill>("intermediate");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const ok = await dispatch({ type: "checkIn", name, skill });
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
      <div className="flex gap-1.5" role="radiogroup" aria-label="Skill level">
        {SKILLS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={skill === option}
            onClick={() => setSkill(option)}
            className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold
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
      <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
        Add to queue
      </button>
    </form>
  );
}
