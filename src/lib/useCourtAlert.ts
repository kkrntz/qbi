"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Two rounds of three rising notes — loud enough to cut through a gym. */
function chime(ctx: AudioContext) {
  const notes = [660, 880, 1320];
  for (let round = 0; round < 2; round++) {
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + round * 0.8 + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }
}

async function notify(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body, tag: "court-call", data: { url: window.location.href } };
  try {
    // Android Chrome only shows notifications through a service worker;
    // desktop browsers are fine with the plain constructor.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.active) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // Notifications are a bonus on top of the chime — never surface a failure.
  }
}

/**
 * Alerts a player the moment they're put on a court: a chime, a vibration,
 * and (where the browser allows it) a system notification. `matchId` is the
 * player's current match, `null` when they aren't on a court, and
 * `undefined` until the session has loaded — so opening the page mid-game
 * stays quiet and only a fresh assignment fires.
 *
 * Browsers block sound and notification prompts until the player taps
 * something, so nothing is audible before `enable()` runs from a click.
 */
export function useCourtAlert(matchId: string | null | undefined, courtName?: string) {
  const [enabled, setEnabled] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (matchId === undefined) return;
    const was = previous.current;
    previous.current = matchId;
    if (was === undefined || !matchId || matchId === was) return;

    if (audio.current) {
      void audio.current.resume().catch(() => {});
      chime(audio.current);
    }
    navigator.vibrate?.([300, 150, 300, 150, 300]);
    void notify("You're up!", courtName ? `Head to ${courtName}.` : "Head to your court.");
  }, [matchId, courtName]);

  const enable = useCallback(async () => {
    const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (AudioCtor) {
      audio.current ??= new AudioCtor();
      void audio.current.resume().catch(() => {});
      chime(audio.current);
    }
    setEnabled(true);
    if ("Notification" in window) {
      void navigator.serviceWorker?.register("/sw.js").catch(() => {});
      if (Notification.permission === "default")
        await Notification.requestPermission().catch(() => {});
    }
  }, []);

  return { enabled, enable };
}
