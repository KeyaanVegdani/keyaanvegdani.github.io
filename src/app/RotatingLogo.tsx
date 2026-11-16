"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { isMuted } from "./sound";
import { DIVIDERS, GROUND_Y, LOGO_HITS, LOGO_LABELS, LOGO_RIGHTS, PIXEL, REGION, STAGE_W, startLogoScene } from "./logo/scene";

// The logos and their shadows are rendered by a WebGL shader into a low-res canvas
// so they come out as solid, chunky pixels (see logo/scene.ts).
// If WebGL2 isn't available we fall back to the smooth CSS version below
// (Apple logo only).
const SIZE = 222;
const LABEL_GAP = 24; // px between the top of a logo and the bottom of its label
const DIVIDER_H = 80; // px; its bottom sits 8px above the ground line
const INDEX_GAP = 8; // px between a logo's right edge and its number

export default function RotatingLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  // Logo under the pointer: it stays full strength, the rest fade back.
  const [hovered, setHovered] = useState<number | null>(null);
  // Little sound each time the pointer moves onto a logo. Each play is its
  // own copy so sweeping across the row overlaps instead of cutting off.
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio("/logo-hover.mp3");
    a.preload = "auto";
    hoverSoundRef.current = a;
  }, []);
  const playHover = () => {
    const a = hoverSoundRef.current;
    if (!a || isMuted()) return;
    (a.cloneNode() as HTMLAudioElement).play().catch(() => {});
  };
  const setFocusRef = useRef<(i: number | null) => void>(() => {});
  const followRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Nudges logo i's label toward the cursor: -1..1 across the hover area,
  // turned into a small offset and tilt (eased by a CSS transition). null recentres it.
  const followCursor = (i: number, e: React.PointerEvent<HTMLDivElement> | null) => {
    const el = followRefs.current[i];
    if (!el) return;
    let x = 0;
    let y = 0;
    if (e) {
      const r = e.currentTarget.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width) * 2 - 1;
      y = ((e.clientY - r.top) / r.height) * 2 - 1;
    }
    el.style.setProperty("--follow-x", x.toFixed(3));
    el.style.setProperty("--follow-y", y.toFixed(3));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    startLogoScene(canvas, { animate })
      .then((s) => {
        if (cancelled) s?.stop();
        else if (s) {
          stop = s.stop;
          setFocusRef.current = s.setFocus;
        } else setFallback(true);
      })
      .catch(() => !cancelled && setFallback(true));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  useEffect(() => setFocusRef.current(hovered), [hovered]);

  if (fallback) return <CssLogo />;

  return (
    <div className="logo-stage" style={{ width: STAGE_W, height: SIZE }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Apple, Electronic Arts, SFU Surge, Symposium 2026 and Thoughts logos"
        width={REGION.w / PIXEL}
        height={REGION.h / PIXEL}
        className="logo-canvas"
        style={{ left: REGION.x, top: REGION.y, width: REGION.w, height: REGION.h }}
      />
      {/* Divider lines between groups of logos. */}
      {DIVIDERS.map((x) => (
        <span key={x} aria-hidden className="logo-divider" style={{ left: x, top: GROUND_Y - DIVIDER_H - 8, height: DIVIDER_H }} />
      ))}
      {/* Hover areas over each logo (the canvas itself is one image). */}
      {LOGO_HITS.map((hit, i) => (
        <div
          key={i}
          className="logo-hit"
          style={hit}
          onPointerEnter={(e) => {
            followCursor(i, e);
            setHovered(i);
            playHover();
          }}
          onPointerMove={(e) => followCursor(i, e)}
          onPointerLeave={() => {
            followCursor(i, null);
            setHovered((h) => (h === i ? null : h));
          }}
        />
      ))}
      {/* Name labels: one per logo, shown above it while it's hovered. */}
      {LOGO_LABELS.map((label, i) => (
        <div
          key={label.name}
          aria-hidden={hovered !== i}
          className={`logo-label${hovered === i ? " is-visible" : ""}`}
          style={{ left: label.x, top: label.y - LABEL_GAP }}
        >
          <span
            className="logo-label-follow"
            ref={(el) => {
              followRefs.current[i] = el;
            }}
          >
            <span className="logo-label-pill">{label.name}</span>
          </span>
        </div>
      ))}
      {/* Index numbers: just right of each logo, bottoms on the ground line. */}
      {LOGO_RIGHTS.map((right, i) => (
        <span
          key={i}
          aria-hidden
          className={`logo-index${hovered !== null ? " is-hidden" : ""}`}
          style={{ left: right + INDEX_GAP, top: GROUND_Y, transform: "translateY(-100%)" }}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

// Two layers exported from Figma ("Not-Rotated" frame): a dark back/side
// silhouette and the silver front face, each with its own rotation (see
// globals.css). The shadow sits outside .logo-bob so it stays on the ground.
function CssLogo() {
  return (
    <div className="logo-stage" style={{ width: SIZE, height: SIZE }}>
      <img src="/logo-shadow.png" alt="" aria-hidden className="logo-cast" />
      <div className="logo-bob">
        <img src="/logo-back.svg" alt="" aria-hidden width={SIZE} height={SIZE} className="logo-layer logo-back" />
        <img src="/logo-front.svg" alt="Apple logo" width={SIZE} height={SIZE} className="logo-layer logo-front" />
      </div>
    </div>
  );
}
