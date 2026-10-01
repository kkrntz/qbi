"use client";

import { useState } from "react";
import type { Club } from "@/lib/types";

/**
 * Chip-select for which clubs a club_admin administers, with an inline
 * "create a new club" row so assigning someone to a brand-new club doesn't
 * require a separate trip to /clubs first. Shared by the create-user form
 * and the edit-user row.
 */
export function ClubPicker({
  clubs,
  clubIds,
  onToggle,
  onClubCreated,
}: {
  clubs: Club[];
  clubIds: string[];
  onToggle: (clubId: string) => void;
  onClubCreated: (club: Club) => void;
}) {
  const [newClubName, setNewClubName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createClub() {
    if (!newClubName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClubName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not create the club.");
      onClubCreated(body as Club);
      setNewClubName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the club.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <span className="label mb-1.5 block">Clubs they administer</span>
      {error && <p className="mb-1.5 text-xs text-danger">{error}</p>}
      {clubs.length === 0 ? (
        <p className="mb-2 text-xs text-muted">No clubs exist yet — add one below.</p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onToggle(club.id)}
              className={`chip cursor-pointer border ${
                clubIds.includes(club.id)
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-inset text-muted"
              }`}
            >
              {club.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          value={newClubName}
          onChange={(e) => setNewClubName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void createClub();
            }
          }}
          placeholder="New club name"
          aria-label="New club name"
          className="min-w-0 flex-1 rounded-lg border border-border bg-inset px-2.5 py-1.5
            text-xs text-text outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void createClub()}
          className="btn px-2.5 py-1.5 text-xs"
          disabled={!newClubName.trim() || creating}
        >
          {creating ? "Adding…" : "+ Add club"}
        </button>
      </div>
    </div>
  );
}
