"use client";

import { useEffect, useRef, useState } from "react";
import type { Club } from "@/lib/types";

function summarize(clubs: Club[], clubIds: string[]): string {
  if (clubIds.length === 0) return "Select clubs…";
  const names = clubIds.map((id) => clubs.find((c) => c.id === id)?.name ?? "Unknown club");
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

/**
 * Dropdown multiselect for which clubs a club_admin administers, with an
 * inline "create a new club" row so assigning someone to a brand-new club
 * doesn't require a separate trip to /clubs first. Shared by the
 * create-user form and the edit-user row.
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
  const [open, setOpen] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
    <div ref={rootRef} className="relative">
      <span className="label mb-1.5 block">Clubs they administer</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border
          bg-inset px-3 py-2 text-left text-sm outline-none transition ${
            open ? "border-accent" : "border-border"
          } ${clubIds.length === 0 ? "text-muted" : "text-text"}`}
      >
        <span className="truncate">{summarize(clubs, clubIds)}</span>
        <span className="shrink-0 text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="panel absolute left-0 top-full z-30 mt-1.5 flex w-full min-w-64
            flex-col gap-2 p-3 shadow-lg"
        >
          {error && <p className="text-xs text-danger">{error}</p>}

          {clubs.length === 0 ? (
            <p className="text-xs text-muted">No clubs exist yet — add one below.</p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {clubs.map((club) => {
                const checked = clubIds.includes(club.id);
                return (
                  <li key={club.id}>
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5
                        text-sm hover:bg-inset"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(club.id)}
                        className="h-4 w-4 shrink-0 accent-accent"
                      />
                      <span className="truncate">{club.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex gap-1.5 border-t border-border pt-2">
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
      )}
    </div>
  );
}
