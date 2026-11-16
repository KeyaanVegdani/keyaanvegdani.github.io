"use client";

import { useEffect, useRef, useState } from "react";
import { isMuted, onMuteChange } from "../sound";
import { TRACKS } from "./tracks";

// Music volume, 0..1 (the iPod's sound effects are separate).
const MUSIC_VOLUME = 0.35;

// Audio for the iPod: one <audio> element, which track is loaded, and
// whether it's playing. When a song ends the next one starts.
export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRef = useRef<number | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const load = (i: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.src = TRACKS[i].src;
    currentRef.current = i;
    setCurrent(i);
    setTime(0);
    setDuration(0);
  };

  /** Plays track i (from the start if it isn't the one already loaded). */
  const play = (i: number) => {
    cancelFade();
    if (currentRef.current !== i) load(i);
    audioRef.current?.play().catch(() => {});
  };

  /** Play/pause the loaded track; with nothing loaded, plays track i. */
  const toggle = (i: number) => {
    const a = audioRef.current;
    if (!a) return;
    if (currentRef.current === null) return play(i);
    cancelFade();
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  // Quick fade to silence, then pause (keeps the song's position). A new
  // play or fade cancels a fade that's still running.
  const fadeRef = useRef(0);
  const cancelFade = () => {
    cancelAnimationFrame(fadeRef.current);
    fadeRef.current = 0;
    if (audioRef.current) audioRef.current.volume = MUSIC_VOLUME;
  };
  const fadeOut = (ms = 350) => {
    const a = audioRef.current;
    if (!a || a.paused) return;
    cancelAnimationFrame(fadeRef.current);
    const from = a.volume;
    const start = performance.now();
    const step = (now: number) => {
      // The frame time can be a touch earlier than `start`, so clamp: a
      // volume above 1 would throw and stop the fade.
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      a.volume = Math.min(1, Math.max(0, from * (1 - t) * (1 - t))); // eases out quickly
      if (t < 1) fadeRef.current = requestAnimationFrame(step);
      else {
        fadeRef.current = 0;
        a.pause();
        a.volume = MUSIC_VOLUME;
      }
    };
    fadeRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    a.volume = MUSIC_VOLUME;
    // Site-wide mute (sound.ts): the music keeps playing, silently.
    a.muted = isMuted();
    const offMute = onMuteChange((m) => (a.muted = m));
    audioRef.current = a;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      const next = ((currentRef.current ?? -1) + 1) % TRACKS.length;
      load(next);
      a.play().catch(() => {});
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      offMute();
      cancelAnimationFrame(fadeRef.current);
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeAttribute("src");
      a.load();
    };
  }, []);

  return { current, playing, time, duration, play, toggle, fadeOut };
}
