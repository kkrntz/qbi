"use client";

import { useEffect, useState } from "react";
import { QrCode } from "./QrCode";

export function SelfCheckInLink({
  clubId,
  sessionId,
}: {
  clubId: string;
  sessionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const path = `/clubs/${clubId}/sessions/${sessionId}/checkin`;
  const url = origin ? `${origin}${path}` : "";

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
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`btn text-xs ${open ? "btn-primary" : ""}`}
        aria-expanded={open}
      >
        Self check-in link
      </button>
      {open && (
        <div
          className="panel absolute right-0 top-full z-30 mt-2 flex w-72 flex-col gap-2 p-3
            shadow-lg"
        >
          <p className="text-xs text-muted">
            Players scan this QR code (or open the link) to check themselves
            in from their phone.
          </p>
          {url && <QrCode value={url} />}
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={url || "Loading…"}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-border bg-inset
                px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
            <button onClick={copy} className="btn px-2 py-1.5 text-xs" disabled={!url}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {url && (
            <a
              href={path}
              target="_blank"
              rel="noreferrer"
              className="text-center text-xs font-medium text-accent hover:underline"
            >
              Open it yourself →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
