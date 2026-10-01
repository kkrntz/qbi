"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Club, PublicUser } from "@/lib/types";
import { UserMenu } from "./UserMenu";

export function ClubManager({ user }: { user: PublicUser }) {
  const isSuperAdmin = user.role === "super_admin";
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function refresh() {
    try {
      const res = await fetch("/api/clubs", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not load clubs.");
      setClubs(body as Club[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load clubs.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createClub(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not create the club.");
      setName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the club.");
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not rename the club.");
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename the club.");
    }
  }

  async function removeClub(club: Club) {
    if (!confirm(`Delete "${club.name}"? This permanently deletes all of its session history too.`))
      return;
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not delete the club.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the club.");
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-ball">●</span> Clubs
          </h1>
          <p className="text-xs text-muted">
            {isSuperAdmin
              ? "Each club keeps its own courts, queue, and session history."
              : "Clubs you administer."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <>
              <Link href="/dashboard" className="btn text-xs">
                Dashboard
              </Link>
              <Link href="/users" className="btn text-xs">
                Users
              </Link>
            </>
          )}
          <UserMenu user={user} />
        </div>
      </div>

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

      {isSuperAdmin && (
        <form onSubmit={createClub} className="panel flex gap-2 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New club name"
            aria-label="New club name"
            className="min-w-0 flex-1 rounded-lg border border-border bg-inset px-3 py-2
              text-sm text-text outline-none placeholder:text-muted focus:border-accent"
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || creating}>
            {creating ? "Adding…" : "Add club"}
          </button>
        </form>
      )}

      {clubs === null ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : clubs.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-muted">
          {isSuperAdmin
            ? "No clubs yet — add one above to get started."
            : "You don't administer any clubs yet. Ask a super admin to add you to one."}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {clubs.map((club) => (
            <li key={club.id} className="panel flex items-center gap-2 p-3">
              {editingId === club.id ? (
                <>
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-border bg-inset
                      px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => saveRename(club.id)}
                    className="btn btn-primary px-2 py-1.5 text-xs"
                    disabled={!editingName.trim()}
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn px-2 py-1.5 text-xs">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <Link href={`/clubs/${club.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-accent">
                    {club.name}
                  </Link>
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(club.id);
                          setEditingName(club.name);
                        }}
                        className="btn px-2 py-1.5 text-xs"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => removeClub(club)}
                        className="btn btn-danger px-2 py-1.5 text-xs"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
