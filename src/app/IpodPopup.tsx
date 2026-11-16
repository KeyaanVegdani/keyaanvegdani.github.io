"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import IpodScreen, { type ScreenView } from "./ipod/IpodScreen";
import { TRACKS } from "./ipod/tracks";
import { createTurnSound } from "./ipod/turnSound";
import { usePlayer } from "./ipod/usePlayer";
import SoundToggle from "./SoundToggle";
import { isMuted, playSound } from "./sound";

// iPod button in the bottom-left of the panel and the popup it opens.
// Designs: Figma 53:732 (front) and 53:710 (back). The popup panel is flat;
// only the yellow iPod is 3D. It's built from plain divs in CSS 3D:
//   - the front face (screen + click wheel) and the back face (back.svg),
//   - a rim joining them: thin strips that follow the rounded outline (the
//     straight sides plus a few short segments around each corner).
// Drag it (or use the arrow keys) to spin it around the y-axis; it keeps
// spinning a little after you let go. It's drawn as pixel art: flat colours
// pixelated, and shading (how much each surface faces away from a light at
// the upper left) as dithered dark pixels, so the shading moves as it turns.
//
// It works: the screen shows Cover Flow / Now Playing (ipod/IpodScreen.tsx)
// for the songs in ipod/tracks.ts, and the click wheel's MENU, back, forward,
// play and centre buttons control it. The screen and the wheel buttons live
// in a third copy of the front face that skips the pixel filters, so covers
// and text stay sharp.

const W = 248; // iPod size, px (Figma)
const H = 400;
const R = 16; // corner radius
const DEPTH = 30; // thickness
const CORNER_SEGMENTS = 6; // rim strips per rounded corner
const DRAG_DEG_PER_PX = 0.6;
const MAX_SPIN = 14; // fastest flick, degrees per frame
const FRICTION = 0.92; // per frame; how quickly a flick slows down
const LIGHT = normalize([-0.4, -0.45, 0.8]); // toward the light (x right, y down, z toward you)

function normalize([x, y, z]: number[]) {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

// Brightness 0.55..1 for a surface normal (already rotated).
const shade = (n: number[]) => 0.55 + 0.45 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);

// Pointer capture keeps a drag going when the pointer leaves the element.
// Ignored if the pointer is already gone.
function capture(el: Element, id: number, on: boolean) {
  try {
    if (on) el.setPointerCapture(id);
    else el.releasePointerCapture(id);
  } catch {}
}

const round = (v: number) => Math.round(v * 100) / 100;

type Strip = { x: number; y: number; len: number; angle: number; nx: number; ny: number };

// Walks the rounded-rectangle outline clockwise and returns one strip per edge
// piece: its centre, length, direction (deg) and outward normal.
function rimStrips(): Strip[] {
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [W - R, R, -90], // top right: arc from -90° to 0°
    [W - R, H - R, 0], // bottom right
    [R, H - R, 90], // bottom left
    [R, R, 180], // top left
  ];
  for (const [cx, cy, start] of corners)
    for (let i = 0; i <= CORNER_SEGMENTS; i++) {
      const a = ((start + (90 * i) / CORNER_SEGMENTS) * Math.PI) / 180;
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
  const strips: Strip[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    // Rounded so server and browser render identical styles.
    strips.push({
      x: round((p[0] + q[0]) / 2),
      y: round((p[1] + q[1]) / 2),
      len: round(len + 0.6), // slight overlap so no hairline gaps show between strips
      angle: round((Math.atan2(dy, dx) * 180) / Math.PI),
      nx: dy / len,
      ny: -dx / len,
    });
  });
  return strips;
}
const STRIPS = rimStrips();

// One copy of the iPod's body. The iPod is drawn twice, stacked exactly:
//   "color": flat colours only, pixelated (#ipod-pixels),
//   "shade": only the shading (how far each surface faces away from the
//            light), turned into dithered dark pixels on the same grid
//            (#ipod-shade).
// Every surface hides its back side, so on this convex shape only the
// surfaces facing you draw, and the shading copy never leaks through.
function Body({
  layer,
  bodyRef,
  rimRefs,
  frontRef,
  backRef,
}: {
  layer: "color" | "shade";
  bodyRef: (el: HTMLDivElement | null) => void;
  rimRefs: React.RefObject<(HTMLDivElement | null)[]>;
  frontRef: React.RefObject<HTMLDivElement | null>;
  backRef: React.RefObject<HTMLDivElement | null>;
}) {
  const color = layer === "color";
  return (
    <div ref={bodyRef} className="ipod-body" style={{ width: W, height: H }}>
      {STRIPS.map((s, i) => (
        <div
          key={i}
          ref={(el) => {
            rimRefs.current[i] = el;
          }}
          className={color ? "ipod-rim" : "ipod-rim ipod-shade-surface"}
          style={{
            width: s.len,
            height: DEPTH,
            left: round(s.x - s.len / 2),
            top: round(s.y - DEPTH / 2),
            transform: `rotateZ(${s.angle}deg) rotateX(90deg)`,
          }}
        />
      ))}

      <div className="ipod-face ipod-front" style={{ transform: `translateZ(${DEPTH / 2}px)` }}>
        {color ? (
          <>
            <div className="ipod-screen" />
            <div className="ipod-wheel">
              <span className="ipod-menu">MENU</span>
              <img className="ipod-prev" src="/ipod/prev.svg" alt="" />
              <img className="ipod-next" src="/ipod/next.svg" alt="" />
              <img className="ipod-play" src="/ipod/play.svg" alt="" />
              <div className="ipod-wheel-center" />
            </div>
          </>
        ) : (
          <div ref={frontRef} className="ipod-shade-surface" />
        )}
      </div>

      <div className="ipod-face ipod-back" style={{ transform: `rotateY(180deg) translateZ(${DEPTH / 2}px)` }}>
        {color ? (
          <img src="/ipod/back.svg" alt="" draggable={false} />
        ) : (
          <div ref={backRef} className="ipod-shade-surface" />
        )}
      </div>
    </div>
  );
}

// Shading: a surface's darkness (0 facing the light .. 0.45 facing away),
// minus SHADE_START so surfaces mostly facing the light stay clean, times
// SHADE_GAIN = the share of its pixels drawn as dark dither pixels.
const SHADE_START = 0.12;
const SHADE_GAIN = 2.6;

// Top-right resize icon (Figma 53:753 -> 60:9): four corner arrows pointing
// in. In compact mode each one turns 180° in place to point out.
const RESIZE_ARROWS = [
  { d: "M5.10506 5.82879C5.3022 5.82879 5.47341 5.75875 5.61868 5.61868C5.75875 5.47341 5.82879 5.30221 5.82879 5.10506C5.82879 5.07912 5.82879 5.05837 5.82879 5.0428C5.82879 5.02724 5.82101 5.01167 5.80545 4.99611L5.80545 1.47082C5.80545 1.47082 5.80545 1.46563 5.80545 1.45525C5.80545 1.45007 5.80545 1.44747 5.80545 1.44747C5.80545 1.25032 5.73541 1.07912 5.59533 0.933852C5.45525 0.793775 5.28405 0.723736 5.08171 0.723736C4.88457 0.723736 4.71595 0.793774 4.57588 0.933852C4.43061 1.07912 4.35798 1.25032 4.35798 1.44747C4.35798 1.44747 4.35798 1.45006 4.35798 1.45525C4.35798 1.46563 4.35798 1.47082 4.35798 1.47082V3.33852L1.25292 0.210117C1.18547 0.153048 1.10506 0.103761 1.01167 0.0622568C0.918288 0.0207522 0.822309 8.6179e-09 0.723736 0C0.526589 -1.7233e-08 0.355383 0.0700392 0.210117 0.210117C0.0700393 0.355383 1.72415e-08 0.526589 0 0.723736C-8.61225e-09 0.822309 0.0207522 0.918288 0.0622567 1.01167C0.103761 1.10506 0.153048 1.18547 0.210117 1.25292L3.33852 4.35798H1.47082C1.47082 4.35798 1.46563 4.35798 1.45525 4.35798C1.45006 4.35798 1.44747 4.35798 1.44747 4.35798C1.25032 4.35798 1.07912 4.43061 0.933852 4.57588C0.793774 4.71595 0.723735 4.88456 0.723735 5.08171C0.723735 5.28405 0.793774 5.45525 0.933851 5.59533C1.07912 5.73541 1.25032 5.80545 1.44747 5.80545C1.44747 5.80545 1.45006 5.80545 1.45525 5.80545C1.46563 5.80545 1.47082 5.80545 1.47082 5.80545H4.99611C5.01167 5.82101 5.02724 5.82879 5.0428 5.82879C5.05836 5.82879 5.07912 5.82879 5.10506 5.82879Z", origin: "2.914px 2.914px" },
  { d: "M10.9183 5.82879C10.9287 5.82879 10.9416 5.82879 10.9572 5.82879C10.9728 5.82879 10.9883 5.82101 11.0039 5.80545H14.5292C14.5292 5.80545 14.5344 5.80545 14.5447 5.80545C14.5499 5.80545 14.5525 5.80545 14.5525 5.80545C14.7497 5.80545 14.9209 5.73541 15.0661 5.59533C15.2062 5.45525 15.2763 5.28405 15.2763 5.08171C15.2763 4.88457 15.2062 4.71595 15.0661 4.57588C14.9209 4.43061 14.7497 4.35798 14.5525 4.35798C14.5525 4.35798 14.5499 4.35798 14.5447 4.35798C14.5344 4.35798 14.5292 4.35798 14.5292 4.35798H12.6615L15.7899 1.25292C15.847 1.18547 15.8962 1.10506 15.9377 1.01167C15.9792 0.918288 16 0.822309 16 0.723736C16 0.526589 15.93 0.355383 15.7899 0.210117C15.6446 0.0700397 15.4734 4.0026e-07 15.2763 3.83024e-07C15.1777 3.74406e-07 15.0817 0.0207526 14.9883 0.0622571C14.8949 0.103762 14.8145 0.153049 14.7471 0.210117L11.642 3.33852V1.47082C11.642 1.47082 11.642 1.46563 11.642 1.45525C11.642 1.45006 11.642 1.44747 11.642 1.44747C11.642 1.25032 11.5694 1.07912 11.4241 0.933852C11.284 0.793774 11.1154 0.723736 10.9183 0.723736C10.716 0.723736 10.5447 0.793774 10.4047 0.933852C10.2646 1.07912 10.1946 1.25032 10.1946 1.44747C10.1946 1.44747 10.1946 1.45006 10.1946 1.45525C10.1946 1.46563 10.1946 1.47082 10.1946 1.47082V4.99611C10.179 5.01167 10.1712 5.02724 10.1712 5.0428C10.1712 5.05837 10.1712 5.07912 10.1712 5.10506C10.1712 5.3022 10.2412 5.47341 10.3813 5.61868C10.5266 5.75875 10.6978 5.82879 10.8949 5.82879C10.9105 5.82879 10.9183 5.82879 10.9183 5.82879Z", origin: "13.086px 2.914px" },
  { d: "M0.747082 16C0.845655 16 0.936446 15.9792 1.01946 15.9377C1.10765 15.8962 1.18547 15.847 1.25292 15.7899L4.35798 12.6615V14.5292C4.35798 14.5292 4.35798 14.5344 4.35798 14.5447C4.35798 14.5499 4.35798 14.5525 4.35798 14.5525C4.35798 14.7497 4.43061 14.9209 4.57588 15.0661C4.71595 15.2062 4.88457 15.2763 5.08171 15.2763C5.08171 15.2763 5.0869 15.2763 5.09728 15.2763C5.10246 15.2763 5.10506 15.2763 5.10506 15.2763C5.3022 15.2763 5.46822 15.2062 5.60311 15.0661C5.738 14.9209 5.80545 14.7497 5.80545 14.5525C5.80545 14.5525 5.80545 14.5499 5.80545 14.5447C5.80545 14.5344 5.80545 14.5292 5.80545 14.5292L5.80545 11.0195C5.82101 11.0091 5.82879 10.9909 5.82879 10.965C5.82879 10.9442 5.82879 10.9209 5.82879 10.8949C5.82879 10.6978 5.75875 10.5266 5.61868 10.3813C5.47341 10.2412 5.3022 10.1712 5.10506 10.1712C5.07912 10.1712 5.05577 10.1712 5.03502 10.1712C5.00908 10.1712 4.99092 10.179 4.98054 10.1946H1.47082C1.47082 10.1946 1.46563 10.1946 1.45525 10.1946C1.45006 10.1946 1.44747 10.1946 1.44747 10.1946C1.25032 10.1946 1.07912 10.2646 0.933851 10.4047C0.793774 10.5447 0.723735 10.716 0.723735 10.9183C0.723735 11.1154 0.793774 11.284 0.933852 11.4241C1.07912 11.5694 1.25032 11.642 1.44747 11.642C1.44747 11.642 1.45006 11.642 1.45525 11.642C1.46563 11.642 1.47082 11.642 1.47082 11.642H3.33852L0.210117 14.7471C0.153048 14.8145 0.103761 14.8949 0.0622567 14.9883C0.0207522 15.0817 -8.61507e-09 15.1777 0 15.2763C1.72358e-08 15.4734 0.0700393 15.6446 0.210117 15.7899C0.355383 15.93 0.526589 16 0.723736 16C0.723736 16 0.726329 16 0.731517 16C0.741893 16 0.747082 16 0.747082 16Z", origin: "2.914px 13.086px" },
  { d: "M15.2763 16C15.4734 16 15.6446 15.93 15.7899 15.7899C15.93 15.6446 16 15.4734 16 15.2763C16 15.1777 15.9792 15.0817 15.9377 14.9883C15.8962 14.8949 15.847 14.8145 15.7899 14.7471L12.6615 11.642H14.5292C14.5292 11.642 14.5344 11.642 14.5447 11.642C14.5499 11.642 14.5525 11.642 14.5525 11.642C14.7497 11.642 14.9209 11.5694 15.0661 11.4241C15.2062 11.284 15.2763 11.1154 15.2763 10.9183C15.2763 10.716 15.2062 10.5447 15.0661 10.4047C14.9209 10.2646 14.7497 10.1946 14.5525 10.1946C14.5525 10.1946 14.5499 10.1946 14.5447 10.1946C14.5344 10.1946 14.5292 10.1946 14.5292 10.1946H11.0195C11.0091 10.179 10.9909 10.1712 10.965 10.1712C10.9442 10.1712 10.9209 10.1712 10.8949 10.1712C10.6978 10.1712 10.5266 10.2412 10.3813 10.3813C10.2412 10.5266 10.1712 10.6978 10.1712 10.8949C10.1712 10.9209 10.1712 10.9442 10.1712 10.965C10.1712 10.9909 10.179 11.0091 10.1946 11.0195V14.5292C10.1946 14.5292 10.1946 14.5344 10.1946 14.5447C10.1946 14.5499 10.1946 14.5525 10.1946 14.5525C10.1946 14.7497 10.2646 14.9209 10.4047 15.0661C10.5447 15.2062 10.716 15.2763 10.9183 15.2763C11.1154 15.2763 11.284 15.2062 11.4241 15.0661C11.5694 14.9209 11.642 14.7497 11.642 14.5525C11.642 14.5525 11.642 14.5499 11.642 14.5447C11.642 14.5344 11.642 14.5292 11.642 14.5292V12.6615L14.7471 15.7899C14.8145 15.847 14.8949 15.8962 14.9883 15.9377C15.0817 15.9792 15.1777 16 15.2763 16Z", origin: "13.086px 13.086px" },
];

// Close X (Figma 53:753). A thin stroke in the same colour thickens its
// lines to match the weight of the resize arrows.
function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.6"
      strokeLinejoin="round"
      overflow="visible"
      aria-hidden
    >
      <path d="M11.8424 11.0603L6.77613 5.99403L6 5.2179L0.939689 0.157588C0.889105 0.114786 0.828794 0.077821 0.758755 0.0466926C0.688716 0.0155642 0.616732 6.46343e-09 0.542802 0C0.394942 -1.29247e-08 0.266537 0.0525294 0.157588 0.157588C0.0525294 0.266537 1.29269e-08 0.394942 0 0.542802C-6.46343e-09 0.616732 0.0155642 0.688716 0.0466926 0.758755C0.077821 0.828794 0.114786 0.889105 0.157588 0.939688L2.50389 3.26848L5.22387 5.99403L6 6.77175L11.0603 11.8424C11.1109 11.8852 11.1712 11.9222 11.2412 11.9533C11.3113 11.9844 11.3833 12 11.4572 12C11.6051 12 11.7335 11.9475 11.8424 11.8424C11.9475 11.7335 12 11.6051 12 11.4572C12 11.3833 11.9844 11.3113 11.9533 11.2412C11.9222 11.1712 11.8852 11.1109 11.8424 11.0603Z" />
      <path d="M5.22387 5.99403L0.157588 11.0603C0.114786 11.1109 0.077821 11.1712 0.0466926 11.2412C0.0155642 11.3113 -6.4613e-09 11.3833 0 11.4572C1.29269e-08 11.6051 0.0525294 11.7335 0.157588 11.8424C0.266537 11.9475 0.394942 12 0.542802 12H0.548638H0.560311C0.634241 12 0.702335 11.9844 0.764592 11.9533C0.83074 11.9222 0.889105 11.8852 0.939689 11.8424L6 6.77175L5.22387 5.99403Z" />
      <path d="M6 5.2179L6.77613 5.99403L9.49611 3.26848L11.8424 0.939689C11.8852 0.889105 11.9222 0.828794 11.9533 0.758755C11.9844 0.688716 12 0.616732 12 0.542802C12 0.394942 11.9475 0.266538 11.8424 0.157588C11.7335 0.0525297 11.6051 3.00195e-07 11.4572 2.87268e-07C11.3833 2.80804e-07 11.3113 0.0155644 11.2412 0.0466928C11.1712 0.0778212 11.1109 0.114787 11.0603 0.157588L6 5.2179Z" />
    </svg>
  );
}

function ResizeIcon() {
  return (
    <svg className="ipod-resize-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      {RESIZE_ARROWS.map((a) => (
        <path key={a.origin} d={a.d} style={{ transformOrigin: a.origin }} />
      ))}
    </svg>
  );
}

export type WheelButton = "menu" | "prev" | "next" | "play" | "select";

const WHEEL_BUTTONS: { id: WheelButton; label: string }[] = [
  { id: "menu", label: "Menu" },
  { id: "next", label: "Next" },
  { id: "play", label: "Play or pause" },
  { id: "prev", label: "Previous" },
  { id: "select", label: "Select" },
];

function Ipod3D({
  active,
  compact,
  screen,
  onWheel,
}: {
  active: boolean;
  /** Compact mode: turns to face you and can't be spun. */
  compact: boolean;
  screen: React.ReactNode;
  onWheel: (b: WheelButton) => void;
}) {
  const state = useRef({ angle: -18, velocity: 0, dragging: false, lastX: 0, lastT: 0 });
  const compactRef = useRef(compact);
  useEffect(() => {
    compactRef.current = compact;
    if (compact) state.current.velocity = 0;
  }, [compact]);
  const stageRef = useRef<HTMLDivElement>(null);
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const colorRim = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRim = useRef<(HTMLDivElement | null)[]>([]);
  const frontShadeRef = useRef<HTMLDivElement>(null);
  const backShadeRef = useRef<HTMLDivElement>(null);
  const screenShadeRef = useRef<HTMLDivElement>(null);
  const unused = useRef<HTMLDivElement>(null);

  // Applies the current angle: turns both copies and updates the shading.
  const apply = () => {
    const a = (state.current.angle * Math.PI) / 180;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    const dark = (n: number[]) => String(Math.min(1, Math.max(0, 1 - shade(n) - SHADE_START) * SHADE_GAIN));
    bodies.current.forEach((b) => b && (b.style.transform = `rotateY(${state.current.angle}deg)`));
    if (frontShadeRef.current) frontShadeRef.current.style.opacity = dark([sin, 0, cos]);
    if (backShadeRef.current) backShadeRef.current.style.opacity = dark([-sin, 0, -cos]);
    if (screenShadeRef.current) screenShadeRef.current.style.opacity = String(Number(dark([sin, 0, cos])) * 0.5);
    STRIPS.forEach((s, i) => {
      const el = shadeRim.current[i];
      if (el) el.style.opacity = dark([s.nx * cos, s.ny, -s.nx * sin]);
    });
  };

  // Looping turn sound while it spins (dragging or the flick after).
  const turnSound = useRef<ReturnType<typeof createTurnSound> | null>(null);
  turnSound.current ??= createTurnSound("/ipod/turn.mp3");

  // Inertia after a flick; idles when stopped or when the popup is closed.
  // Also feeds the turn sound how fast the iPod is turning each frame.
  useEffect(() => {
    apply();
    const sound = turnSound.current;
    if (!active) return;
    let raf = 0;
    let lastAngle = state.current.angle;
    const tick = () => {
      const s = state.current;
      if (compactRef.current) {
        // Ease round to face straight on (the nearest full turn).
        const target = Math.round(s.angle / 360) * 360;
        if (s.angle !== target) {
          s.angle += (target - s.angle) * 0.14;
          if (Math.abs(target - s.angle) < 0.05) s.angle = target;
          apply();
        }
      } else if (!s.dragging && Math.abs(s.velocity) > 0.01) {
        s.angle += s.velocity;
        s.velocity *= FRICTION;
        apply();
      }
      sound?.update(Math.abs(s.angle - lastAngle));
      lastAngle = s.angle;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      sound?.stop();
    };
  }, [active]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (compactRef.current) return; // can't spin it in compact mode
    turnSound.current?.prime();
    const s = state.current;
    s.dragging = true;
    s.velocity = 0;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    if (stageRef.current) capture(stageRef.current, e.pointerId, true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = state.current;
    if (!s.dragging) return;
    const now = performance.now();
    const d = (e.clientX - s.lastX) * DRAG_DEG_PER_PX;
    s.angle += d;
    // Degrees per frame (~16ms), for the flick afterwards.
    s.velocity = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, (d / Math.max(8, now - s.lastT)) * 16));
    s.lastX = e.clientX;
    s.lastT = now;
    apply();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = state.current;
    s.dragging = false;
    // A pause before letting go means no flick.
    if (performance.now() - s.lastT > 80) s.velocity = 0;
    if (stageRef.current) capture(stageRef.current, e.pointerId, false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (compactRef.current) return;
    e.preventDefault();
    turnSound.current?.prime();
    state.current.velocity += e.key === "ArrowLeft" ? -3 : 3;
  };

  return (
    <div
      ref={stageRef}
      className="ipod-stage"
      role="slider"
      tabIndex={0}
      aria-label="Rotate the iPod (drag or use the arrow keys)"
      aria-valuenow={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {/* Two stacked copies, each pixelated by its own filter (DitherFilter.tsx),
          with the palette curves over both. */}
      <div className="ipod-art">
        <div className="ipod-layer ipod-layer-color">
          <Body layer="color" bodyRef={(el) => void (bodies.current[0] = el)} rimRefs={colorRim} frontRef={unused} backRef={unused} />
        </div>
        <div className="ipod-layer ipod-layer-shade">
          <Body
            layer="shade"
            bodyRef={(el) => void (bodies.current[1] = el)}
            rimRefs={shadeRim}
            frontRef={frontShadeRef}
            backRef={backShadeRef}
          />
        </div>
      </div>

      {/* Third copy of just the front: the live screen and the wheel buttons,
          unfiltered so they stay sharp. Turns with the rest; hidden when the
          front faces away. */}
      <div className="ipod-layer ipod-layer-live">
        <div ref={(el) => void (bodies.current[2] = el)} className="ipod-body" style={{ width: W, height: H }}>
          <div className="ipod-face ipod-live" style={{ transform: `translateZ(${DEPTH / 2 + 0.5}px)` }}>
            <div className="ipod-live-screen">
              {screen}
              <div ref={screenShadeRef} className="ipod-live-shade" />
            </div>
            <div className="ipod-live-wheel">
              {WHEEL_BUTTONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`ipod-wheel-btn is-${b.id}`}
                  aria-label={b.label}
                  tabIndex={active ? 0 : -1}
                  // Pressing a button never starts spinning the iPod.
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onWheel(b.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IpodPopup() {
  const [open, setOpen] = useState(false);
  // Compact mode (top-right button): half-height window showing the screen.
  const [compact, setCompact] = useState(false);

  // What the iPod shows and plays. Opens on Cover Flow with nothing playing.
  const player = usePlayer();
  const [view, setView] = useState<ScreenView>("coverflow");
  const [selected, setSelected] = useState(0);
  const last = TRACKS.length - 1;
  // Click sound for the wheel buttons. Loaded once; each press plays its own
  // copy so quick presses overlap instead of cutting each other off.
  const clickRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio("/ipod/click.mp3");
    a.preload = "auto";
    clickRef.current = a;
  }, []);
  const playClick = () => {
    if (isMuted()) return;
    const c = clickRef.current?.cloneNode() as HTMLAudioElement | undefined;
    c?.play().catch(() => {});
  };

  const onWheel = (b: WheelButton) => {
    playClick();
    if (b === "menu") return setView((v) => (v === "coverflow" ? "playing" : "coverflow"));
    if (b === "prev" || b === "next") {
      const step = b === "next" ? 1 : -1;
      if (view === "coverflow") return setSelected((i) => Math.max(0, Math.min(last, i + step)));
      // Now Playing: skip to the previous / next song.
      const i = ((player.current ?? selected) + step + TRACKS.length) % TRACKS.length;
      setSelected(i);
      return player.play(i);
    }
    if (b === "play") {
      // In Cover Flow, a different album than the one loaded starts that album.
      if (view === "coverflow" && player.current !== selected) return player.play(selected);
      return player.toggle(selected);
    }
    // Centre button: play the selected album and show Now Playing.
    if (view === "coverflow") {
      player.play(selected);
      setView("playing");
    } else player.toggle(selected);
  };

  // Shrink the popup to fit short windows (it's 558px tall, opening above the icon row).
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fit = () => {
      const el = popupRef.current;
      const panel = el?.offsetParent as HTMLElement | null;
      if (!el || !panel) return;
      // Room above the icon row, less a gap below and a margin at the top.
      const row = panel.querySelector<HTMLElement>(".corner-controls");
      const room = (row?.offsetTop ?? panel.clientHeight) - 16 - 16;
      el.style.setProperty("--ipod-scale", String(Math.min(1, room / 558)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Moving the panel: drag the top bar. The offset is kept in --move-x/y
  // (globals.css) and stays put between opens. The panel can't leave the
  // main panel.
  const moveRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, active: false });
  const startMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const m = moveRef.current;
    m.active = true;
    m.lastX = e.clientX;
    m.lastY = e.clientY;
    capture(e.currentTarget, e.pointerId, true);
    popupRef.current?.classList.add("is-moving");
  };
  const move = (e: React.PointerEvent) => {
    const m = moveRef.current;
    const el = popupRef.current;
    const bounds = (el?.offsetParent as HTMLElement | null)?.getBoundingClientRect();
    if (!m.active || !el || !bounds) return;
    const r = el.getBoundingClientRect();
    const M = 8; // keep this far inside the main panel
    const dx = Math.max(bounds.left + M - r.left, Math.min(bounds.right - M - r.right, e.clientX - m.lastX));
    const dy = Math.max(bounds.top + M - r.top, Math.min(bounds.bottom - M - r.bottom, e.clientY - m.lastY));
    m.x += dx;
    m.y += dy;
    m.lastX += dx;
    m.lastY += dy;
    el.style.setProperty("--move-x", `${m.x}px`);
    el.style.setProperty("--move-y", `${m.y}px`);
  };
  const endMove = (e: React.PointerEvent<HTMLDivElement>) => {
    moveRef.current.active = false;
    capture(e.currentTarget, e.pointerId, false);
    popupRef.current?.classList.remove("is-moving");
  };

  // Window sounds: one when the iPod opens, another when it closes.
  const openSound = useRef<HTMLAudioElement | null>(null);
  const closeSound = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    openSound.current = new Audio("/ipod/open.mp3");
    closeSound.current = new Audio("/ipod/close.mp3");
    openSound.current.preload = closeSound.current.preload = "auto";
  }, []);

  // On opening / closing (not on page load): play the matching sound, and
  // when closing, fade the music out quickly and pause it.
  const { fadeOut } = player;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;
    playSound((open ? openSound : closeSound).current);
    if (!open) fadeOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes the popup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Icon row by the intro text (Figma 56:806): iPod, divider, sound. */}
      <div className="corner-controls">
        <button
          type="button"
          className="corner-icon"
          aria-label={open ? "Close iPod" : "Open iPod"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {/* Inline so it takes the button's colour (darker on hover). */}
          <svg width="11" height="16" viewBox="0 0 8 12" fill="currentColor" aria-hidden>
            <path d="M0 10.3843C0 11.3486 0.654849 12 1.63921 12H6.38165C7.34932 12 8 11.3486 8 10.3843V1.61571C8 0.651429 7.34932 0 6.38165 0H1.63921C0.654849 0 0 0.651429 0 1.61571V10.3843ZM1.10532 4.56V1.84714C1.10532 1.39286 1.36809 1.14 1.82273 1.14H6.1731C6.63191 1.14 6.88634 1.40143 6.88634 1.84714V4.55143C6.88634 5.00143 6.63191 5.25429 6.1731 5.25429H1.82273C1.36809 5.25429 1.10532 5.00143 1.10532 4.56ZM4 10.7743C2.76955 10.7743 1.76434 9.75 1.76434 8.48571C1.76434 7.21714 2.76955 6.19286 4 6.19286C5.22628 6.19286 6.23149 7.21714 6.23149 8.48571C6.23149 9.75 5.22628 10.7743 4 10.7743ZM4 9.86143C4.74244 9.86143 5.34307 9.24 5.34307 8.48571C5.34307 7.72286 4.74244 7.10572 4 7.10572C3.25339 7.10572 2.65693 7.72286 2.65693 8.48571C2.65693 9.24 3.25339 9.86143 4 9.86143Z" />
          </svg>
        </button>
        <span className="corner-divider" aria-hidden />
        <SoundToggle />
      </div>

      <div ref={popupRef} className={`ipod-popup${open ? " is-open" : ""}${compact ? " is-compact" : ""}`} role="dialog" aria-label="iPod" aria-hidden={!open}>
        <div
          className="ipod-header"
          onPointerDown={startMove}
          onPointerMove={move}
          onPointerUp={endMove}
          onPointerCancel={endMove}
        >
          <button
            type="button"
            className="ipod-close"
            aria-label="Close"
            onClick={() => setOpen(false)}
            onPointerDown={(e) => e.stopPropagation()}
            tabIndex={open ? 0 : -1}
          >
            <CloseIcon />
          </button>
          <span>iPod</span>
          <button
            type="button"
            className="ipod-resize"
            aria-label={compact ? "Show the whole iPod" : "Shrink to the screen"}
            aria-pressed={compact}
            onClick={() => setCompact((c) => !c)}
            onPointerDown={(e) => e.stopPropagation()}
            tabIndex={open ? 0 : -1}
          >
            <ResizeIcon />
          </button>
        </div>
        <Ipod3D
          active={open}
          compact={compact}
          onWheel={onWheel}
          screen={
            <IpodScreen
              view={view}
              selected={selected}
              current={player.current}
              playing={player.playing}
              time={player.time}
              duration={player.duration}
            />
          }
        />
      </div>
    </>
  );
}
