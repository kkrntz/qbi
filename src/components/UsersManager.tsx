"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Club, PublicUser, Role } from "@/lib/types";
import { ClubPicker } from "./ClubPicker";
import { EditUserRow } from "./EditUserRow";
import { UserMenu } from "./UserMenu";

export function UsersManager({ currentUser }: { currentUser: PublicUser }) {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("club_admin");
  const [clubIds, setClubIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    try {
      const [usersRes, clubsRes] = await Promise.all([
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/clubs", { cache: "no-store" }),
      ]);
      const usersBody = await usersRes.json();
      if (!usersRes.ok) throw new Error(usersBody?.error ?? "Could not load users.");
      setUsers(usersBody as PublicUser[]);
      setClubs(((await clubsRes.json()) as Club[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function toggleClub(id: string) {
    setClubIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function addClub(club: Club) {
    setClubs((prev) => [...prev, club].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, clubIds }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not create the user.");
      setEmail("");
      setPassword("");
      setClubIds([]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the user.");
    } finally {
      setCreating(false);
    }
  }

  async function removeUser(user: PublicUser) {
    if (!confirm(`Remove ${user.email}'s access?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not remove the user.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the user.");
    }
  }

  const clubName = (id: string) => clubs.find((c) => c.id === id)?.name ?? "Unknown club";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/clubs" className="text-xs font-medium text-muted hover:text-accent hover:underline">
            ← Clubs
          </Link>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Users</h1>
          <p className="text-xs text-muted">
            Super admins manage every club; club admins manage only the clubs
            assigned to them.
          </p>
        </div>
        <UserMenu user={currentUser} />
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

      <form onSubmit={createUser} className="panel flex flex-col gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="new-user-email" className="label mb-1.5 block">
              Email
            </label>
            <input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-inset px-3 py-2
                text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="new-user-password" className="label mb-1.5 block">
              Password
            </label>
            <input
              id="new-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="w-full rounded-lg border border-border bg-inset px-3 py-2
                text-sm text-text outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <span className="label mb-1.5 block">Role</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Role">
            {(["club_admin", "super_admin"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={role === option}
                onClick={() => setRole(option)}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  role === option
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-inset text-muted hover:text-text"
                }`}
              >
                {option === "club_admin" ? "Club admin" : "Super admin"}
              </button>
            ))}
          </div>
        </div>

        {role === "club_admin" && (
          <ClubPicker
            clubs={clubs}
            clubIds={clubIds}
            onToggle={toggleClub}
            onClubCreated={(club) => {
              addClub(club);
              setClubIds((prev) => [...prev, club.id]);
            }}
          />
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={
            !email.trim() ||
            password.length < 8 ||
            (role === "club_admin" && clubIds.length === 0) ||
            creating
          }
        >
          {creating ? "Adding…" : "Add user"}
        </button>
      </form>

      {users === null ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : users.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-muted">No users yet.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((user) =>
            editingId === user.id ? (
              <EditUserRow
                key={user.id}
                user={user}
                clubs={clubs}
                onClubCreated={addClub}
                onCancel={() => setEditingId(null)}
                onSaved={(updated) => {
                  setUsers((prev) =>
                    prev?.map((u) => (u.id === updated.id ? updated : u)) ?? prev,
                  );
                  setEditingId(null);
                }}
              />
            ) : (
              <li key={user.id} className="panel flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{user.email}</span>
                    <span className="chip bg-inset text-muted">
                      {user.role === "super_admin" ? "super admin" : "club admin"}
                    </span>
                  </div>
                  {user.role === "club_admin" && (
                    <span className="text-xs text-muted">
                      {user.clubIds.length === 0
                        ? "No clubs assigned"
                        : user.clubIds.map(clubName).join(", ")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setEditingId(user.id)}
                  className="btn px-2 py-1.5 text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeUser(user)}
                  className="btn btn-danger px-2 py-1.5 text-xs"
                  disabled={user.id === currentUser.id}
                  title={user.id === currentUser.id ? "You can't remove your own account" : undefined}
                >
                  Remove
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
