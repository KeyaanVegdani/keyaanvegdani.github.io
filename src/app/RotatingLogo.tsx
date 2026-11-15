"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { GROUND_Y, LOGO_HITS, LOGO_LABELS, LOGO_RIGHTS, PIXEL, REGION, STAGE_W, startLogoScene } from "./logo/scene";

// The logos and their shadows are rendered by a WebGL shader into a low-res canvas
// so they come out as solid, chunky pixels (see logo/scene.ts).
// If WebGL2 isn't available we fall back to the smooth CSS version below
// (Apple logo only).
const SIZE = 222;
const LABEL_GAP = 24; // px between the top of a logo and the bottom of its label
const INDEX_GAP = 8; // px between a logo's right edge and its number

export default function RotatingLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  // Logo under the pointer: it stays full strength, the rest fade back.
  const [hovered, setHovered] = useState<number | null>(null);
  const setFocusRef = useRef<(i: number | null) => void>(() => {});

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
        aria-label="Apple, EA and two more logos"
        width={REGION.w / PIXEL}
        height={REGION.h / PIXEL}
        className="logo-canvas"
        style={{ left: REGION.x, top: REGION.y, width: REGION.w, height: REGION.h }}
      />
      {/* Hover areas over each logo (the canvas itself is one image). */}
      {LOGO_HITS.map((hit, i) => (
        <div
          key={i}
          className="logo-hit"
          style={hit}
          onPointerEnter={() => setHovered(i)}
          onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
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
          <span className="logo-label-pill">{label.name}</span>
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
