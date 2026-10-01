"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, useTicker } from "@/lib/useSession";
import { playersPerGame, type Player, type PublicUser } from "@/lib/types";
import { buildSessionExport, downloadJson, sessionFileName } from "@/lib/sessionExport";
import { AssignPlayersModal } from "./AssignPlayersModal";
import { CheckInForm } from "./CheckInForm";
import { CourtCard } from "./CourtCard";
import { EditMatchModal } from "./EditMatchModal";
import { EndSessionModal } from "./EndSessionModal";
import { QueuePanel } from "./QueuePanel";
import { SelfCheckInLink } from "./SelfCheckInLink";
import { UserMenu } from "./UserMenu";
import { BenchPanel, HistoryPanel, LeaderboardPanel } from "./Panels";

export function SessionDashboard({
  clubId,
  clubName,
  sessionId,
  user,
}: {
  clubId: string;
  clubName: string;
  sessionId: string;
  user: PublicUser;
}) {
  const { state, error, dispatch, dismissError } = useSession(clubId, sessionId);
  const now = useTicker();
  const router = useRouter();
  const [editMatchCourtId, setEditMatchCourtId] = useState<string | null>(null);
  const [assignCourtId, setAssignCourtId] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteSession() {
    if (
      !state ||
      !confirm(
        `Permanently delete "${state.label || "this session"}"? This can't be undone.`,
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error ?? "Could not delete the session.");
      }
      router.push(`/clubs/${clubId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete the session.");
      setDeleting(false);
    }
  }

  const players = useMemo(
    () => new Map((state?.players ?? []).map((p) => [p.id, p])),
    [state?.players],
  );

  const waitingPlayers = useMemo(
    () =>
      (state?.queue ?? [])
        .map((id) => players.get(id))
        .filter((p): p is Player => Boolean(p)),
    [state?.queue, players],
  );

  if (!state) {
    return (
      <p className="p-10 text-center text-sm text-muted">Loading session…</p>
    );
  }

  if (state.endedAt !== null) {
    const durationMinutes = Math.max(
      0,
      Math.round((state.endedAt - state.startedAt) / 60000),
    );
    const sessionPlayers = new Map(state.players.map((p) => [p.id, p]));
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={`/clubs/${clubId}`}
              className="text-xs font-medium text-muted hover:text-accent hover:underline"
            >
              ← {clubName}
            </Link>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {state.label || "Session"}
            </h1>
            <p className="text-xs text-muted">
              Ended {new Date(state.endedAt).toLocaleString()} · read-only
            </p>
          </div>
          <UserMenu user={user} />
        </div>

        <dl className="panel grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="label">Duration</dt>
            <dd className="font-semibold">
              {durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                : `${durationMinutes}m`}
            </dd>
          </div>
          <div>
            <dt className="label">Players</dt>
            <dd className="font-semibold">{state.players.length}</dd>
          </div>
          <div>
            <dt className="label">Games played</dt>
            <dd className="font-semibold">{state.history.length}</dd>
          </div>
          <div>
            <dt className="label">Courts</dt>
            <dd className="font-semibold">{state.courts.length}</dd>
          </div>
        </dl>

        <div className="flex gap-2">
          <button
            onClick={() =>
              downloadJson(sessionFileName(state), buildSessionExport(state))
            }
            className="btn flex-1"
          >
            Download session data
          </button>
          <button
            onClick={() => void deleteSession()}
            className="btn btn-danger"
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete session"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel p-4">
            <LeaderboardPanel players={state.players} />
          </div>
          <div className="panel p-4">
            <HistoryPanel history={state.history} players={sessionPlayers} />
          </div>
        </div>
      </div>
    );
  }

  const { courts, queue, settings, history } = state;
  const benched = state.players.filter((p) => p.status === "benched");
  const playing = state.players.filter((p) => p.status === "playing").length;
  const liveCourts = courts.filter((c) => c.match).length;
  const needed = playersPerGame(settings.gameMode);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/clubs/${clubId}`}
            className="text-xs font-medium text-muted hover:text-accent hover:underline"
          >
            ← {clubName}
          </Link>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-ball">●</span> {state.label || "Session"}
          </h1>
          <p className="text-xs text-muted">
            {state.players.length} checked in · {playing} on court ·{" "}
            {queue.length} waiting · {history.length} games played
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex overflow-hidden rounded-lg border border-border"
            role="radiogroup"
            aria-label="Game mode"
          >
            {(["doubles", "singles"] as const).map((mode) => (
              <button
                key={mode}
                role="radio"
                aria-checked={settings.gameMode === mode}
                onClick={() => dispatch({ type: "setGameMode", gameMode: mode })}
                className={`px-3 py-2 text-xs font-semibold capitalize transition ${
                  settings.gameMode === mode
                    ? "bg-accent text-accent-ink"
                    : "bg-inset text-muted hover:text-text"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              dispatch({
                type: "setWinnersStay",
                winnersStay: !settings.winnersStay,
              })
            }
            className={`btn text-xs ${settings.winnersStay ? "btn-primary" : ""}`}
            aria-pressed={settings.winnersStay}
            title={
              settings.winnersStay
                ? "On: winners rejoin the back of the line just ahead of their losing opponents. Click to switch to strict first-come, first-served."
                : "Off: strict first-come, first-served — winners and losers rejoin the back of the line in the same order. Click to give winners priority over their opponents."
            }
          >
            Winner priority
          </button>

          <button onClick={() => dispatch({ type: "addCourt" })} className="btn text-xs">
            + Court
          </button>

          <SelfCheckInLink clubId={clubId} sessionId={sessionId} />

          <button
            onClick={() => setEndingSession(true)}
            className="btn btn-danger text-xs"
          >
            End session
          </button>

          <UserMenu user={user} />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border
            border-danger/40 bg-danger-soft px-4 py-2.5 text-sm text-danger"
        >
          <span>{error}</span>
          <button onClick={dismissError} className="font-bold" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {courts.map((court) => (
              <CourtCard
                key={court.id}
                clubId={clubId}
                sessionId={sessionId}
                court={court}
                players={players}
                gameMode={settings.gameMode}
                queueDepth={queue.length}
                now={now}
                canRemove={courts.length > 1}
                dispatch={dispatch}
                onEditMatch={() => setEditMatchCourtId(court.id)}
                onAssignPlayers={() => setAssignCourtId(court.id)}
              />
            ))}
          </div>

          {courts.length === 0 && (
            <div className="panel p-6 text-center text-sm text-muted">
              No courts yet — add one to start a rotation.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel p-4">
              <LeaderboardPanel players={state.players} />
            </div>
            <div className="panel p-4">
              <HistoryPanel history={history} players={players} />
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="panel p-4">
            <h2 className="mb-3 text-sm font-bold">Check in</h2>
            <CheckInForm dispatch={dispatch} />
            <p className="mt-2 text-[11px] text-muted">
              {settings.gameMode === "doubles"
                ? `Teams are balanced automatically from the first ${needed} in line.`
                : `The first ${needed} in line are paired head to head.`}
            </p>
          </div>

          <div className="panel p-4">
            <QueuePanel
              clubId={clubId}
              sessionId={sessionId}
              queue={queue}
              players={players}
              gameMode={settings.gameMode}
              now={now}
              dispatch={dispatch}
            />
          </div>

          <div className="panel p-4">
            <BenchPanel
              clubId={clubId}
              sessionId={sessionId}
              benched={benched}
              dispatch={dispatch}
            />
          </div>

          <p className="px-1 text-[11px] text-muted">
            {liveCourts} of {courts.length} court
            {courts.length === 1 ? "" : "s"} in play · updates every few seconds
            across devices.
          </p>
        </aside>
      </div>

      {editMatchCourtId &&
        (() => {
          const court = courts.find((c) => c.id === editMatchCourtId);
          if (!court?.match) return null;
          return (
            <EditMatchModal
              courtId={court.id}
              courtName={court.name}
              gameMode={settings.gameMode}
              match={court.match}
              waiting={waitingPlayers}
              players={players}
              dispatch={dispatch}
              onClose={() => setEditMatchCourtId(null)}
            />
          );
        })()}

      {assignCourtId &&
        (() => {
          const court = courts.find((c) => c.id === assignCourtId);
          if (!court || court.match) return null;
          return (
            <AssignPlayersModal
              courtId={court.id}
              courtName={court.name}
              gameMode={settings.gameMode}
              waiting={waitingPlayers}
              players={players}
              dispatch={dispatch}
              onClose={() => setAssignCourtId(null)}
            />
          );
        })()}

      {endingSession && (
        <EndSessionModal
          state={state}
          onClose={() => setEndingSession(false)}
          onEnded={() => router.push(`/clubs/${clubId}`)}
        />
      )}
    </div>
  );
}
