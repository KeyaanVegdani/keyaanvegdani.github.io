"use client";

import { useSyncExternalStore } from "react";

// Site-wide mute (the speaker button next to the iPod icon). Every sound on
// the site checks this: the iPod's music, its clicks, the turning loop and
// the open / close sounds. Remembered in this browser between visits.
let muted = false;
try {
  muted = localStorage.getItem("muted") === "1";
} catch {}

const listeners = new Set<(m: boolean) => void>();

export const isMuted = () => muted;

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("muted", m ? "1" : "0");
  } catch {}
  listeners.forEach((f) => f(m));
}

/** Calls `f` whenever mute changes; returns an unsubscribe function. */
export function onMuteChange(f: (m: boolean) => void) {
  listeners.add(f);
  return () => void listeners.delete(f);
}

/** Current mute state for components (false while rendering on the server). */
export function useMuted() {
  return useSyncExternalStore(onMuteChange, isMuted, () => false);
}

/** Plays a sound effect from the start, unless the site is muted. */
export function playSound(a: HTMLAudioElement | null | undefined) {
  if (!a || muted) return;
  a.currentTime = 0;
  a.play().catch(() => {});
}
