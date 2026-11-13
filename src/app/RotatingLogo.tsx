"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { PIXEL, REGION, STAGE_W, startLogoScene } from "./logo/scene";

// The logos and their shadows are rendered by a WebGL shader into a low-res canvas
// so they come out as solid, chunky pixels (see logo/scene.ts).
// If WebGL2 isn't available we fall back to the smooth CSS version below
// (Apple logo only).
const SIZE = 222;

export default function RotatingLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    startLogoScene(canvas, { animate })
      .then((s) => {
        if (cancelled) s?.();
        else if (s) stop = s;
        else setFallback(true);
      })
      .catch(() => !cancelled && setFallback(true));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  if (fallback) return <CssLogo />;

  return (
    <div className="logo-stage" style={{ width: STAGE_W, height: SIZE }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Apple and EA logos"
        width={REGION.w / PIXEL}
        height={REGION.h / PIXEL}
        className="logo-canvas"
        style={{ left: REGION.x, top: REGION.y, width: REGION.w, height: REGION.h }}
      />
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
