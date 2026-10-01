"use client";

import { useState } from "react";

/**
 * Small icon button that copies a player's personal status link to the
 * clipboard, so an operator can hand it to a player they checked in
 * themselves (self check-in links to it automatically on check-in).
 */
export function PlayerLinkButton({
  clubId,
  sessionId,
  playerId,
  playerName,
}: {
  clubId: string;
  sessionId: string;
  playerId: string;
  playerName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(event: React.MouseEvent) {
    event.stopPropagation();
    const url = `${window.location.origin}/clubs/${clubId}/sessions/${sessionId}/p/${playerId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; there's no visible URL fallback
      // here, so there's nothing more to do.
    }
  }

  return (
    <button
      onClick={copy}
      className="btn btn-icon"
      aria-label={`Copy ${playerName}'s status link`}
      title={copied ? "Copied!" : `Copy ${playerName}'s status link`}
    >
      {copied ? "✓" : "🔗"}
    </button>
  );
}
