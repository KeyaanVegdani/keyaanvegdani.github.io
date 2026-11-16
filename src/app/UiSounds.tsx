"use client";

import { useEffect } from "react";
import { isMuted } from "./sound";

// The small UI buttons: gallery X and arrows, the iPod / sound icons, the
// iPod window's header buttons and the CMD + K button. Add a selector here
// to give another button the same sounds.
const SMALL_UI = [
  ".gallery-close",
  ".gallery-nav button",
  ".corner-icon",
  ".ipod-close",
  ".ipod-resize",
  ".cmdk-button",
].join(", ");

// Soft tick when the pointer moves onto one, a click sound when it's pressed.
// One listener for the whole page, so buttons that come and go (the gallery,
// the iPod window) are covered without wiring each one up.
export default function UiSounds() {
  useEffect(() => {
    const load = (src: string) => {
      const a = new Audio(src);
      a.preload = "auto";
      return a;
    };
    const hover = load("/ui/hover.mp3");
    const press = load("/ui/press.mp3");
    // Each play is its own copy so quick hovers/presses overlap.
    const play = (a: HTMLAudioElement) => {
      if (isMuted()) return;
      (a.cloneNode() as HTMLAudioElement).play().catch(() => {});
    };
    const target = (e: Event) => (e.target as Element | null)?.closest?.(SMALL_UI) ?? null;

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // no hover sound on touch
      const el = target(e);
      // Only when arriving from outside the button, not between its children.
      if (el && !el.contains(e.relatedTarget as Node | null)) play(hover);
    };
    const onClick = (e: MouseEvent) => {
      if (target(e)) play(press);
    };
    document.addEventListener("pointerover", onOver);
    // Capture phase: some buttons sit in containers that stop clicks from
    // bubbling (the gallery's arrow bar), so listen on the way down.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
