"use client";

import Link from "next/link";
import { useSession, useTicker } from "@/lib/useSession";
import { formatClock, formatWait } from "@/lib/format";
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

  if (!state) {
    return (
      <Centered>
        <p className="text-sm text-muted">Loading your status…</p>
      </Centered>
    );
  }

  const me = state.players.find((p) => p.id === playerId);

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

  if (!me) {
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
    const court = state.courts.find(
      (c) => c.match && (c.match.teamA.includes(me.id) || c.match.teamB.includes(me.id)),
    );
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
        <h1 className="text-xl font-bold">You&apos;re sitting out</h1>
        <p className="text-sm text-muted">
          You&apos;re still checked in, just out of the rotation for now.
        </p>
        <button
          onClick={() => dispatch({ type: "setBenched", playerId: me.id, benched: false })}
          className="btn btn-primary mt-2 w-full max-w-xs"
        >
          I&apos;m back — rejoin the queue
        </button>
      </Centered>
    );
  }

  // waiting
  const position = state.queue.indexOf(me.id) + 1;

  return (
    <Centered>
      <span className="text-4xl">⏳</span>
      <h1 className="text-xl font-bold">
        {position > 0 ? `You're #${position} in line` : "You're in the queue"}
      </h1>
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
        onClick={() => {
          if (confirm("Leave the queue?")) dispatch({ type: "checkOut", playerId: me.id });
        }}
        className="btn btn-danger mt-2 w-full max-w-xs"
      >
        Leave the queue
      </button>
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
