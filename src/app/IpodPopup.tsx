"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

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

function Ipod3D({ active }: { active: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const colorRim = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRim = useRef<(HTMLDivElement | null)[]>([]);
  const frontShadeRef = useRef<HTMLDivElement>(null);
  const backShadeRef = useRef<HTMLDivElement>(null);
  const unused = useRef<HTMLDivElement>(null);
  const state = useRef({ angle: -18, velocity: 0, dragging: false, lastX: 0, lastT: 0 });

  // Applies the current angle: turns both copies and updates the shading.
  const apply = () => {
    const a = (state.current.angle * Math.PI) / 180;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    const dark = (n: number[]) => String(Math.min(1, Math.max(0, 1 - shade(n) - SHADE_START) * SHADE_GAIN));
    bodies.current.forEach((b) => b && (b.style.transform = `rotateY(${state.current.angle}deg)`));
    if (frontShadeRef.current) frontShadeRef.current.style.opacity = dark([sin, 0, cos]);
    if (backShadeRef.current) backShadeRef.current.style.opacity = dark([-sin, 0, -cos]);
    STRIPS.forEach((s, i) => {
      const el = shadeRim.current[i];
      if (el) el.style.opacity = dark([s.nx * cos, s.ny, -s.nx * sin]);
    });
  };

  // Inertia after a flick; idles when stopped or when the popup is closed.
  useEffect(() => {
    apply();
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const s = state.current;
      if (!s.dragging && Math.abs(s.velocity) > 0.01) {
        s.angle += s.velocity;
        s.velocity *= FRICTION;
        apply();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const onPointerDown = (e: React.PointerEvent) => {
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
    e.preventDefault();
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
      {/* Two stacked copies, each pixelated by its own filter (DitherFilter.tsx). */}
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
  );
}

export default function IpodPopup() {
  const [open, setOpen] = useState(false);

  // Shrink the popup to fit short windows (it's 558px tall plus the gap above the icon).
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fit = () => {
      const el = popupRef.current;
      const panel = el?.offsetParent as HTMLElement | null;
      if (!el || !panel) return;
      el.style.setProperty("--ipod-scale", String(Math.min(1, (panel.clientHeight - 58 - 16) / 558)));
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

  // Escape closes the popup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="ipod-button"
        aria-label={open ? "Close iPod" : "Open iPod"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Inline so it takes the button's colour (darker on hover). */}
        <svg width="12" height="18" viewBox="0 0 8 12" fill="currentColor" aria-hidden>
          <path d="M0 10.3843C0 11.3486 0.654849 12 1.63921 12H6.38165C7.34932 12 8 11.3486 8 10.3843V1.61571C8 0.651429 7.34932 0 6.38165 0H1.63921C0.654849 0 0 0.651429 0 1.61571V10.3843ZM1.10532 4.56V1.84714C1.10532 1.39286 1.36809 1.14 1.82273 1.14H6.1731C6.63191 1.14 6.88634 1.40143 6.88634 1.84714V4.55143C6.88634 5.00143 6.63191 5.25429 6.1731 5.25429H1.82273C1.36809 5.25429 1.10532 5.00143 1.10532 4.56ZM4 10.7743C2.76955 10.7743 1.76434 9.75 1.76434 8.48571C1.76434 7.21714 2.76955 6.19286 4 6.19286C5.22628 6.19286 6.23149 7.21714 6.23149 8.48571C6.23149 9.75 5.22628 10.7743 4 10.7743ZM4 9.86143C4.74244 9.86143 5.34307 9.24 5.34307 8.48571C5.34307 7.72286 4.74244 7.10572 4 7.10572C3.25339 7.10572 2.65693 7.72286 2.65693 8.48571C2.65693 9.24 3.25339 9.86143 4 9.86143Z" />
        </svg>
      </button>

      <div ref={popupRef} className={`ipod-popup${open ? " is-open" : ""}`} role="dialog" aria-label="iPod" aria-hidden={!open}>
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
            <img src="/ipod/close.svg" alt="" width={10} height={10} />
          </button>
          <span>iPod</span>
          <img src="/ipod/menu.svg" alt="" width={14.3} height={22.14} />
        </div>
        <Ipod3D active={open} />
      </div>
    </>
  );
}
