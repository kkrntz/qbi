"use client";

import { useMemo } from "react";
import { useSession, useTicker } from "@/lib/useSession";
import { playersPerGame } from "@/lib/types";
import { CheckInForm } from "./CheckInForm";
import { CourtCard } from "./CourtCard";
import { QueuePanel } from "./QueuePanel";
import { BenchPanel, HistoryPanel, LeaderboardPanel } from "./Panels";

export function SessionDashboard() {
  const { state, error, dispatch, dismissError } = useSession();
  const now = useTicker();

  const players = useMemo(
    () => new Map((state?.players ?? []).map((p) => [p.id, p])),
    [state?.players],
  );

  if (!state) {
    return (
      <p className="p-10 text-center text-sm text-muted">Loading session…</p>
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-ball">●</span> Pickleball Queue
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
            title="Winners go back to the front of the queue"
          >
            Winners stay
          </button>

          <button onClick={() => dispatch({ type: "addCourt" })} className="btn text-xs">
            + Court
          </button>

          <button
            onClick={() => {
              if (confirm("Clear all players, games and stats?"))
                dispatch({ type: "resetSession" });
            }}
            className="btn btn-danger text-xs"
          >
            Reset
          </button>
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
                court={court}
                players={players}
                gameMode={settings.gameMode}
                queueDepth={queue.length}
                now={now}
                canRemove={courts.length > 1}
                dispatch={dispatch}
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
              queue={queue}
              players={players}
              gameMode={settings.gameMode}
              now={now}
              dispatch={dispatch}
            />
          </div>

          <div className="panel p-4">
            <BenchPanel benched={benched} dispatch={dispatch} />
          </div>

          <p className="px-1 text-[11px] text-muted">
            {liveCourts} of {courts.length} court
            {courts.length === 1 ? "" : "s"} in play · updates every few seconds
            across devices.
          </p>
        </aside>
      </div>
    </div>
  );
}
