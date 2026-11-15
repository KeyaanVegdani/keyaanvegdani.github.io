"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

// Pixel snowflakes drifting down the main panel. Each flake blurs and fades in
// somewhere in a band above the logos (APPEAR), falls past them, then blurs and
// fades out somewhere in a band below them (VANISH). When it's gone it starts
// again from a new random spot, randomly mirrored. Everything is randomised on the client only,
// so server and client markup always match.
const FLAKES: { src: string; w: number; h: number }[] = [
  { src: "/flakes/flake-2.svg", w: 46, h: 46 },
  { src: "/flakes/flake-3.svg", w: 46, h: 64 },
  { src: "/flakes/flake-4.svg", w: 46, h: 46 },
  { src: "/flakes/flake-5.svg", w: 64, h: 55 },
];
const COUNT = 18;

// Bands in px from the panel's vertical centre (the logos' ground line is at
// about +63). Negative is above the centre.
const APPEAR = [-240, -400];
const VANISH = [75, 400];
const SPEED = [18, 60]; // fall speed, px per second
const FADE_PX = 50; // distance over which a flake blurs/fades in or out
const BLUR = 6; // px of blur while faded

type Flake = {
  src: string;
  w: number;
  h: number;
  scale: number;
  sway: number;
  swayTime: number;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeFlakes(): Flake[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    ...FLAKES[i % FLAKES.length],
    scale: rand(0.3, 0.6),
    sway: rand(8, 24),
    swayTime: rand(4, 8),
  }));
}

/** One fall: fade in at a random spot in APPEAR, fall, fade out in VANISH. Loops forever with new spots. */
function fall(el: HTMLElement, panel: HTMLElement, first: boolean) {
  const mid = panel.clientHeight / 2;
  const start = mid + rand(APPEAR[0], APPEAR[1]);
  const end = mid + rand(VANISH[0], VANISH[1]);
  const dist = end - start;
  const fade = Math.min(FADE_PX, dist / 3) / dist; // fraction of the path spent fading
  const hidden = { opacity: 0, filter: `blur(${BLUR}px)` };
  const shown = { opacity: 1, filter: "blur(0px)" };
  el.style.left = `${rand(0, 100)}%`;
  // Mirror about half the flakes so the same designs don't repeat as obviously.
  el.style.setProperty("--flip", Math.random() < 0.5 ? "-1" : "1");
  const anim = el.animate(
    [
      { transform: `translateY(${start}px)`, ...hidden, offset: 0 },
      {
        transform: `translateY(${start + dist * fade}px)`,
        ...shown,
        offset: fade,
      },
      {
        transform: `translateY(${end - dist * fade}px)`,
        ...shown,
        offset: 1 - fade,
      },
      { transform: `translateY(${end}px)`, ...hidden, offset: 1 },
    ],
    {
      duration: (dist / rand(SPEED[0], SPEED[1])) * 1000,
      easing: "linear",
      fill: "both",
    },
  );
  // On load, start each flake part-way through so the snow is already going.
  if (first)
    anim.currentTime = rand(
      0,
      Number(anim.effect?.getComputedTiming().duration ?? 0),
    );
  anim.onfinish = () => {
    if (el.isConnected) fall(el, panel, false);
  };
  return anim;
}

export default function Snowfall() {
  const [flakes, setFlakes] = useState<Flake[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Client-only randomness; deferred so it isn't a synchronous effect update.
    const id = requestAnimationFrame(() => setFlakes(makeFlakes()));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !flakes.length) return;
    const els = [...layer.children] as HTMLElement[];
    els.forEach((el) => fall(el, layer, true));
    return () =>
      els.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  }, [flakes]);

  return (
    <div ref={layerRef} className="snowfall" aria-hidden>
        {flakes.map((f, i) => (
          <div
            key={i}
            className="snowflake"
            style={
              {
                "--sway": `${f.sway}px`,
                "--sway-time": `${f.swayTime}s`,
              } as React.CSSProperties
            }
          >
            <img
              src={f.src}
              alt=""
              width={f.w * f.scale}
              height={f.h * f.scale}
            />
          </div>
        ))}
    </div>
  );
}
