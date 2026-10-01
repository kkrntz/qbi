"use client";

import { useState } from "react";
import type { Club, PublicUser, Role } from "@/lib/types";
import { ClubPicker } from "./ClubPicker";

export function EditUserRow({
  user,
  clubs,
  onClubCreated,
  onSaved,
  onCancel,
}: {
  user: PublicUser;
  clubs: Club[];
  onClubCreated: (club: Club) => void;
  onSaved: (updated: PublicUser) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [clubIds, setClubIds] = useState<string[]>(user.clubIds);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleClub(id: string) {
    setClubIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          clubIds,
          ...(password ? { password } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not update the user.");
      onSaved(body as PublicUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the user.");
      setSaving(false);
    }
  }

  const invalid =
    !email.trim() ||
    (password !== "" && password.length < 8) ||
    (role === "club_admin" && clubIds.length === 0);

  return (
    <li className="panel flex flex-col gap-3 p-4">
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`edit-email-${user.id}`} className="label mb-1.5 block">
            Email
          </label>
          <input
            id={`edit-email-${user.id}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-inset px-3 py-2
              text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor={`edit-password-${user.id}`} className="label mb-1.5 block">
            New password
          </label>
          <input
            id={`edit-password-${user.id}`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            minLength={8}
            className="w-full rounded-lg border border-border bg-inset px-3 py-2
              text-sm text-text outline-none placeholder:text-muted focus:border-accent"
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
            onClubCreated(club);
            setClubIds((prev) => [...prev, club.id]);
          }}
        />
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn flex-1" disabled={saving}>
          Cancel
        </button>
        <button
          onClick={() => void save()}
          className="btn btn-primary flex-1"
          disabled={invalid || saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </li>
  );
}
