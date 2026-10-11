"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession, useTicker } from "@/lib/useSession";
import { useCourtAlert } from "@/lib/useCourtAlert";
import { formatClock, formatWait } from "@/lib/format";
import { partnerOf } from "@/lib/teamPicker";
import { PartnerModal } from "./PartnerModal";
import { SkillChip } from "./ui";

export function PlayerStatus({
  clubId,
  sessionId,
  playerId,
}: {
  clubId: string;
  sessionId: string;
  playerId: string;
}) {
  const { state, error, busy, dispatch } = useSession(clubId, sessionId);
  const now = useTicker();
  const [pairing, setPairing] = useState(false);
  const players = useMemo(
    () => new Map((state?.players ?? []).map((p) => [p.id, p])),
    [state?.players],
  );

  const me = state?.players.find((p) => p.id === playerId);
  const myCourt = state?.courts.find(
    (c) => c.match && (c.match.teamA.includes(playerId) || c.match.teamB.includes(playerId)),
  );
  const alerts = useCourtAlert(state ? (myCourt?.match?.id ?? null) : undefined, myCourt?.name);

  if (!state) {
    return (
      <Centered>
        <p className="text-sm text-muted">Loading your status…</p>
      </Centered>
    );
  }

  if (state.endedAt !== null) {
    return (
      <Centered>
        <span className="text-4xl">🏁</span>
        <h1 className="text-xl font-bold">This session has ended</h1>
        <p className="text-sm text-muted">
          Thanks for playing! Ask an operator for the link to a new session.
        </p>
      </Centered>
    );
  }

  if (!me || me.status === "left") {
    return (
      <Centered>
        <span className="text-4xl">👋</span>
        <h1 className="text-xl font-bold">You&apos;re not checked in</h1>
        <p className="text-sm text-muted">
          You&apos;ve been checked out of this session.
        </p>
        <Link
          href={`/clubs/${clubId}/sessions/${sessionId}/checkin`}
          className="btn btn-primary mt-2 w-full max-w-xs"
        >
          Check in
        </Link>
      </Centered>
    );
  }

  if (me.status === "playing") {
    const court = myCourt;
    const match = court?.match;
    const onTeamA = match?.teamA.includes(me.id);
    const mates = (onTeamA ? match?.teamA : match?.teamB)?.filter((id) => id !== me.id) ?? [];
    const opponents = (onTeamA ? match?.teamB : match?.teamA) ?? [];
    const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? "—";

    return (
      <Centered>
        <span className="text-4xl">🎾</span>
        <h1 className="text-xl font-bold">You&apos;re up — {court?.name ?? "on court"}!</h1>
        {match && (
          <p className="font-mono text-2xl font-bold tabular-nums text-accent">
            {formatClock(now - match.startedAt)}
          </p>
        )}
        <p className="text-sm text-muted">
          {mates.length > 0 ? `You & ${mates.map(name).join(", ")}` : "You"} vs{" "}
          {opponents.map(name).join(", ") || "—"}
        </p>
        {mates.length === 1 && (
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <p className="label">Choose your partner</p>
            {[...mates, ...opponents].map((id) => (
              <button
                key={id}
                onClick={() => dispatch({ type: "choosePartner", playerId: me.id, partnerId: id })}
                disabled={busy || mates.includes(id)}
                className={`btn w-full ${mates.includes(id) ? "btn-primary" : ""}`}
              >
                {name(id)}
                {mates.includes(id) && " · your partner"}
              </button>
            ))}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        )}
        <p className="text-xs text-muted">Your stats update when the game ends.</p>
      </Centered>
    );
  }

  if (me.status === "benched") {
    return (
      <Centered>
        <span className="text-4xl">⏸</span>
        <h1 className="text-xl font-bold">You&apos;re on hold</h1>
        <p className="text-sm text-muted">
          You&apos;re still checked in, just out of the rotation for now.
          You&apos;ll rejoin at the back of the line.
        </p>
        <button
          onClick={() => dispatch({ type: "setBenched", playerId: me.id, benched: false })}
          disabled={busy}
          className="btn btn-primary mt-2 w-full max-w-xs"
        >
          I&apos;m back — rejoin the queue
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </Centered>
    );
  }

  // waiting
  const partner = partnerOf(me, players);
  return (
    <Centered>
      <span className="text-4xl">⏳</span>
      <h1 className="text-xl font-bold">You&apos;re in the queue</h1>
      <div className="flex items-center justify-center gap-2">
        <SkillChip skill={me.skill} />
        <span className="text-xs text-muted">
          waiting {formatWait(now - (me.queuedAt ?? now))} · {me.gamesPlayed} played
        </span>
      </div>
      <p className="text-sm text-muted">
        {state.queue.length} waiting · {state.courts.filter((c) => c.match).length}/
        {state.courts.length} courts in play
      </p>
      <button
        onClick={() => void alerts.enable()}
        className={`btn mt-2 w-full max-w-xs ${alerts.enabled ? "" : "btn-primary"}`}
      >
        {alerts.enabled ? "🔔 Alerts on — tap to test" : "🔔 Alert me when I'm called"}
      </button>
      {alerts.enabled && (
        <p className="text-xs text-muted">
          Keep this page open with your sound on — it chimes when you&apos;re assigned a court.
        </p>
      )}
      {state.settings.gameMode === "doubles" && (
        <button onClick={() => setPairing(true)} className="btn w-full max-w-xs">
          {partner ? `🤝 Playing with ${partner.name} — change` : "🤝 Play as a pair"}
        </button>
      )}
      <button
        onClick={() => dispatch({ type: "setBenched", playerId: me.id, benched: true })}
        disabled={busy}
        className="btn w-full max-w-xs"
      >
        ⏸ Put me on hold
      </button>
      <button
        onClick={() => {
          if (confirm("Leave the queue?")) dispatch({ type: "checkOut", playerId: me.id });
        }}
        disabled={busy}
        className="btn btn-danger w-full max-w-xs"
      >
        Leave the queue
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
      {pairing && (
        <PartnerModal
          own
          player={me}
          players={players}
          dispatch={dispatch}
          onClose={() => setPairing(false)}
        />
      )}
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </div>
  );
}
