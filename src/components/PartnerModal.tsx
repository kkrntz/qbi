"use client";

import { createPortal } from "react-dom";
import type { Dispatch } from "@/lib/useSession";
import type { Player } from "@/lib/types";
import { partnerOf } from "@/lib/teamPicker";
import { Avatar, SkillChip } from "./ui";

/**
 * Picks (or clears) the player's doubles partner. `own` words it for the
 * player's own status page rather than for an operator.
 */
export function PartnerModal({
  player,
  players,
  dispatch,
  onClose,
  own = false,
}: {
  player: Player;
  players: Map<string, Player>;
  dispatch: Dispatch;
  onClose: () => void;
  own?: boolean;
}) {
  const partner = partnerOf(player, players);
  const others = [...players.values()].filter(
    (p) => p.id !== player.id && p.status !== "left",
  );

  async function setPartner(partnerId: string | null) {
    const ok = await dispatch({ type: "setPartner", playerId: player.id, partnerId });
    if (ok) onClose();
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={own ? "Choose your partner" : `Choose ${player.name}'s partner`}
    >
      <div
        className="panel flex w-full max-w-sm flex-col gap-3 p-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">
              {own ? "Play as a pair" : `${player.name}'s partner`}
            </h2>
            <p className="text-xs text-muted">
              Partners are called up together and play on the same team in
              doubles. They&apos;re called once both have reached the front of
              the line.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-icon shrink-0" aria-label="Close">
            ×
          </button>
        </header>

        {others.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted">
            Nobody else is checked in yet.
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
            {others.map((other) => {
              const theirs = partnerOf(other, players);
              const isPartner = theirs?.id === player.id;
              const taken = Boolean(theirs) && !isPartner;
              return (
                <li
                  key={other.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-2"
                >
                  <Avatar player={other} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold" title={other.name}>
                        {other.name}
                      </span>
                      <SkillChip skill={other.skill} />
                    </div>
                    {taken && (
                      <span className="block truncate text-[11px] text-muted">
                        paired with {theirs!.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => void setPartner(isPartner ? null : other.id)}
                    className={`pill ${isPartner ? "pill-on" : ""}`}
                    disabled={taken}
                    aria-pressed={isPartner}
                  >
                    {isPartner ? "Paired" : "Pair"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {partner && (
          <button onClick={() => void setPartner(null)} className="btn w-full">
            Unpair from {partner.name}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
