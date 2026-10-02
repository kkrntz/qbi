"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { QrCode } from "./QrCode";

/**
 * Small icon button that opens a player's personal status link as a QR code
 * (with a copy button), so an operator can hand it to a player they checked
 * in themselves (self check-in links to it automatically on check-in).
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
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function open(event: React.MouseEvent) {
    event.stopPropagation();
    setUrl(`${window.location.origin}/clubs/${clubId}/sessions/${sessionId}/p/${playerId}`);
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked (e.g. no HTTPS/permission); the URL
      // is still visible and selectable, so there's nothing more to do.
    }
  }

  return (
    <>
      <button
        onClick={open}
        className="btn btn-icon"
        aria-label={`Show ${playerName}'s status link`}
        title={`Show ${playerName}'s status link and QR code`}
      >
        🔗
      </button>
      {url &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setUrl(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`${playerName}'s status link`}
          >
            <div
              className="panel flex w-full max-w-xs flex-col gap-3 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold">{playerName}</h2>
                  <p className="text-xs text-muted">
                    Scan to open their personal status page.
                  </p>
                </div>
                <button onClick={() => setUrl(null)} className="btn btn-icon" aria-label="Close">
                  ×
                </button>
              </header>
              <QrCode value={url} />
              <div className="flex items-center gap-1.5">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-inset
                    px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
                />
                <button onClick={copy} className="btn px-2 py-1.5 text-xs">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
