"use client";

import { useEffect, useRef, useState } from "react";
import { SKY } from "./sky";

// ─── Running fox ───────────────────────────────────────────────────────────
// Every so often a little fox gallops across the first screen, left to
// right, in front of the logos. It's rebuilt from the blocks of the Figma fox
// (pose 65:906) as a small rig: each leg swings from its hip, the head and
// ears bob, the tail streams behind and the body rises and dips.
//
// It's drawn the way the logos are (logo/scene.ts), into a low-res canvas
// where one canvas pixel is one 2px cell, scaled up with hard edges:
//   - every cell is fully on or off (alpha cut at 50%), no soft edges
//   - chromatic aberration: each cell's red is blended with the cell to its
//     left and its blue with the cell to its right, against the page
//     background behind (the same sky gradient the logos use), so fringes are
//     whole cells and the fox never turns see-through
//   - a cast shadow: its silhouette squashed and sheared left from the paws,
//     fading with distance, then ordered-dithered into speckles

const FIRST_RUN_MS = [500, 500]; // wait before the first run, after the page loads
const BETWEEN_RUNS_MS = [18000, 40000]; // wait between runs
// Running speed in px per second. The crossing time is worked out from the
// screen width, so it runs at the same pace however wide the window is
// (rather than taking the same time and racing across wide screens).
const SPEED = 260;
const STRIDE_MS = 560; // one full gallop stride
const FOX_W = 225; // keep in step with .fox width in globals.css
const CELL = 2; // CSS px per pixel cell (the logos' PIXEL)
// Colour split, as a share of a cell (the logos use 0.5).
const CA_CELLS = 0.5;
// Cast shadow, like the logos': shear, squash, colour and density boost.
const SHADOW_SKEW_DEG = 68;
const SHADOW_SQUASH = 0.32;
const SHADOW_RGB = [153, 156, 168];
// How strongly each speckle shows over the page (1 = solid shadow grey).
const SHADOW_OPACITY = 0.55;
const SHADOW_GAIN = 1 / 0.45;
// Densest the shadow gets, so the dither always leaves holes (at 1 it would
// fill in solid near the paws). 0.7 = about 11 of every 16 cells on.
const SHADOW_MAX = 0.7;

// Rig space: the Figma frame's units. The fox's box shows x 40..290 and
// y 20..180 at 0.9 CSS px per unit; the canvas reaches further left for the
// shadow. GROUND is where the paws meet the floor.
const UNIT = 0.9;
const VIEW = { x: -80, y: 20, w: 370, h: 160 };
const BOX_X = 40;
const GROUND = { x: 175, y: 166 };
const K = UNIT / CELL; // canvas pixels per rig unit
const CW = Math.ceil(VIEW.w * K);
const CH = Math.ceil(VIEW.h * K);

// The run, moving in whole 2px steps so the fox's pixels stay on the
// screen's pixel grid instead of smearing between positions.
function runStyle() {
  const from = -(FOX_W + 21) & ~1; // even
  const steps = Math.ceil((window.innerWidth + 20 - from) / CELL);
  return {
    "--fox-run": `${((steps * CELL) / SPEED).toFixed(2)}s`,
    "--fox-from": `${from}px`,
    "--fox-to": `${from + steps * CELL}px`,
    "--fox-steps": steps,
  } as React.CSSProperties;
}

const between = ([lo, hi]: number[]) => lo + Math.random() * (hi - lo);

// [x, y, width, height, rotation°, fill], in each part's own space (its pivot
// at 0,0). Worked out from the Figma pose so the rest pose matches it.
type R = [number, number, number, number, number, string];
const LEG_FAR: R[] = [[-8,0,16,57,0,"#fc5412"],[-12,40,16,17,0,"#fc5412"],[-12,8,16,27,0,"#fc5412"]];
const LEG_NEAR: R[] = [[-13,0,26,49,0,"#fc5412"],[-13,0,15,49,0,"#fc6f1e"],[-7,-6,14,49,0,"#fc6f1e"],[-1,0,14,36,0,"#fc6f1e"]];
const BODY: R[] = [[119.45,79.53,118,48,0.89,"#fc5412"],[119.53,78.99,48,39,0.89,"#fc6f1e"],[110.32,88.66,24,46,0.89,"#fc6f1e"],[134.59,79.22,48,31,0.89,"#fc6f1e"],[119.7,78.99,48,17,0.89,"#cfd9f2"],[119.76,78.87,32,9,0.89,"#cdb5db"],[110.63,87.55,9,8,0.89,"#cdb5db"],[110.5,95.54,9,8,0.89,"#fc5412"]];
const HEAD: R[] = [[-14.2,-42.69,67,48,9.29,"#fc6f1e"],[19.06,-17.23,29,21,9.29,"#fc5412"],[5.07,-27.05,12,12,9.29,"#2d2c39"],[47.56,-20.67,5,12,9.29,"#2d2c39"],[14.38,-8.96,4,10,9.29,"#e8e7f1"],[24.24,-7.19,6,10,9.29,"#e8e7f1"],[29.98,-16.34,18,21,9.29,"#2d2c39"],[43.94,-15.21,5,8,9.29,"#5f5c7f"],[29.09,-5.41,18,10,9.29,"#e8e7f1"],[45.95,-3.64,6,10,9.29,"#e8e7f1"]];
const EAR_L: R[] = [[-10,-36,20,36,0,"#fc6f1e"],[-13,-25,20,36,0,"#fc6f1e"],[-7,-37.99,20,36,0,"#2d2c39"],[-5,-34.99,18,33,0,"#e8e7f1"],[0,-27,13,25,0,"#cfd9f2"],[5,-26.99,8,6,0,"#cdb5db"],[10.01,-37.99,3,36,0,"#5f5c7f"]];
const EAR_R: R[] = [[-10,-36,20,36,0,"#fc6f1e"],[-13,-25.01,20,36,0,"#fc6f1e"],[-7,-38.01,20,36,0,"#2d2c39"],[-5,-35,18,33,0,"#e8e7f1"],[0,-27,13,25,0,"#cfd9f2"],[5,-17,8,6,0,"#cdb5db"],[10,-38.01,3,36,0,"#5f5c7f"]];
const TAIL: R[] = [[-14,0,28,52,0,"#fc5412"],[-8.99,7,18,52,0,"#fc5412"],[-5,-8,19,52,0,"#fc5412"],[0,-12,10,52,0,"#fc5412"],[0,-12,5,52,0,"#fc6f1e"],[5,-12,5,19,0,"#fc6f1e"],[-5,-8,5,52,0,"#fc6f1e"],[-14,0,9,52,0,"#fc6f1e"]];


// ── Animation ──────────────────────────────────────────────────────────────
// Keyframes over one stride (phase 0..1): [phase, angle°, leg length].
type Key = [number, number, number?];
const LEG_FRONT: Key[] = [[0, -58, 1], [0.5, 30, 1], [0.75, -14, 0.78], [1, -58, 1]];
const LEG_BACK: Key[] = [[0, 56, 1], [0.25, 16, 0.78], [0.5, -24, 1], [1, 56, 1]];
const HEAD_TILT: Key[] = [[0, 0], [0.25, 3], [0.5, 0], [0.75, -3], [1, 0]];
const EAR_FLICK: Key[] = [[0, -2], [0.4, -12], [1, -2]];
const TAIL_WAVE: Key[] = [[0, 6], [0.5, -10], [1, 6]];
// Body: [phase, rise px, pitch°], linear between.
const BODY_MOVE: Key[] = [[0, 3, 0], [0.25, -4, -3], [0.5, 0, 0], [0.75, -3, 3], [1, 3, 0]];

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
function sample(keys: Key[], phase: number, smooth = true): [number, number] {
  const p = ((phase % 1) + 1) % 1;
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, v1, s1 = 1] = keys[i];
    const [b, v2, s2 = 1] = keys[i + 1];
    if (p <= b) {
      const t = smooth ? ease((p - a) / (b - a)) : (p - a) / (b - a);
      return [v1 + (v2 - v1) * t, s1 + (s2 - s1) * t];
    }
  }
  return [keys[0][1], keys[0][2] ?? 1];
}
const rad = (d: number) => (d * Math.PI) / 180;

function blocks(ctx: CanvasRenderingContext2D, rects: R[], ink?: string) {
  for (const [x, y, w, h, r, fill] of rects) {
    ctx.fillStyle = ink ?? fill;
    if (!r) ctx.fillRect(x, y, w, h);
    else {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rad(r));
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
}
function part(ctx: CanvasRenderingContext2D, at: number[], angle: number, length: number, rects: R[], ink?: string) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.rotate(rad(angle));
  ctx.scale(1, length);
  blocks(ctx, rects, ink);
  ctx.restore();
}

// The fox at one moment of its stride, in rig units. `ink` paints it all one
// colour (for the shadow's silhouette).
function drawFox(ctx: CanvasRenderingContext2D, phase: number, ink?: string) {
  const [rise, pitch] = sample(BODY_MOVE, phase, false);
  const leg = (keys: Key[], ph: number) => sample(keys, ph);
  ctx.save();
  ctx.translate(175, 105 + rise);
  ctx.rotate(rad(pitch));
  ctx.translate(-175, -105);
  // Far-side legs (trailing the near ones a touch), behind the body.
  const ff = leg(LEG_FRONT, phase + 0.12);
  const fb = leg(LEG_BACK, phase + 0.12);
  part(ctx, [220.89, 109.96], ff[0], ff[1], LEG_FAR, ink);
  part(ctx, [166.9, 107.29], fb[0], fb[1], LEG_FAR, ink);
  blocks(ctx, BODY, ink);
  ctx.save();
  ctx.translate(205, 103);
  ctx.rotate(rad(sample(HEAD_TILT, phase)[0]));
  part(ctx, [5.26, -33.61], -40.65 + sample(EAR_FLICK, phase)[0], 1, EAR_L, ink);
  part(ctx, [32.37, -32.81], -39.76 + sample(EAR_FLICK, phase + 0.08)[0], 1, EAR_R, ink);
  blocks(ctx, HEAD, ink);
  ctx.restore();
  part(ctx, [112.05, 92.53], 111.37 + sample(TAIL_WAVE, phase + 0.3)[0], 1, TAIL, ink);
  // Near-side legs, in front.
  const nf = leg(LEG_FRONT, phase);
  const nb = leg(LEG_BACK, phase);
  part(ctx, [194.94, 118.7], nf[0], nf[1], LEG_NEAR, ink);
  part(ctx, [132.89, 117.11], nb[0], nb[1], LEG_NEAR, ink);
  ctx.restore();
}

// ── Pixels ─────────────────────────────────────────────────────────────────
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Page colour behind each canvas row: the sky gradient (sky.ts) by distance
// from the top of the main panel, then the plain background.
function backgroundRows(topInPanel: number): number[][] {
  const vh = window.innerHeight;
  const stops = SKY.map((s) => ({ at: s.at, rgb: hexRgb(s.color) }));
  const bg = hexRgb(getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#F9F9F9");
  return Array.from({ length: CH }, (_, row) => {
    const t = (topInPanel + (row + 0.5) * CELL) / vh;
    if (t <= stops[0].at) return stops[0].rgb;
    for (let i = 1; i < stops.length; i++)
      if (t <= stops[i].at) {
        const f = (t - stops[i - 1].at) / (stops[i].at - stops[i - 1].at);
        return stops[i].rgb.map((v, c) => v + (stops[i - 1].rgb[c] - v) * (1 - f));
      }
    return bg;
  });
}

function makeRenderer(canvas: HTMLCanvasElement, rows: number[][]) {
  const out = canvas.getContext("2d")!;
  const layer = (() => {
    const c = document.createElement("canvas");
    c.width = CW;
    c.height = CH;
    return c.getContext("2d", { willReadFrequently: true })!;
  })();
  const toCells = (ctx: CanvasRenderingContext2D) => ctx.setTransform(K, 0, 0, K, -VIEW.x * K, -VIEW.y * K);
  const img = out.createImageData(CW, CH);
  const fox = new Uint8Array(CW * CH);
  const shadow = new Float32Array(CW * CH);
  const blurred = new Float32Array(CW * CH);
  const tan = Math.tan(rad(SHADOW_SKEW_DEG));

  return (phase: number) => {
    // Shadow silhouette: squashed and sheared from the ground line, faded
    // with distance from the paws.
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, CW, CH);
    toCells(layer);
    layer.translate(GROUND.x, GROUND.y);
    layer.transform(1, 0, tan, 1, 0, 0);
    layer.scale(1, SHADOW_SQUASH);
    layer.translate(-GROUND.x, -GROUND.y);
    drawFox(layer, phase, "#000");
    const fade = layer.createLinearGradient(0, GROUND.y, 0, 30);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(0.6, "rgba(0,0,0,0.35)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    layer.globalCompositeOperation = "destination-in";
    layer.fillStyle = fade;
    layer.fillRect(-400, -400, 1200, 1200);
    layer.globalCompositeOperation = "source-over";
    let d = layer.getImageData(0, 0, CW, CH).data;
    for (let i = 0; i < CW * CH; i++) shadow[i] = d[i * 4 + 3] / 255;
    // Soften (3x3, like the logos' shadow blur), then boost.
    for (let y = 0; y < CH; y++)
      for (let x = 0; x < CW; x++) {
        let a = 0;
        for (let j = -1; j <= 1; j++)
          for (let i = -1; i <= 1; i++) {
            const xx = Math.min(CW - 1, Math.max(0, x + i));
            const yy = Math.min(CH - 1, Math.max(0, y + j));
            a += shadow[yy * CW + xx];
          }
        blurred[y * CW + x] = Math.min(SHADOW_MAX, (a / 9) * SHADOW_GAIN);
      }

    // The fox itself, cut to fully on/off cells.
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, CW, CH);
    toCells(layer);
    drawFox(layer, phase);
    d = layer.getImageData(0, 0, CW, CH).data;
    for (let i = 0; i < CW * CH; i++) fox[i] = d[i * 4 + 3] >= 128 ? 1 : 0;

    // Compose: each cell's colour over what's behind it (shadow speckle or
    // page), then red from the left neighbour and blue from the right.
    const o = img.data;
    for (let y = 0; y < CH; y++) {
      const bg = rows[y];
      // Speckle colour on this row: the shadow grey part-way over the page.
      const shade = bg.map((v, c) => v + (SHADOW_RGB[c] - v) * SHADOW_OPACITY);
      for (let x = 0; x < CW; x++) {
        const i = y * CW + x;
        const speck = blurred[i] > BAYER[(x % 4) + (y % 4) * 4];
        const under = (j: number, xx: number) =>
          blurred[j] > BAYER[(xx % 4) + (y % 4) * 4] ? shade : bg;
        const col = (xx: number) => {
          if (xx < 0 || xx >= CW) return bg;
          const j = y * CW + xx;
          return fox[j] ? [d[j * 4], d[j * 4 + 1], d[j * 4 + 2]] : under(j, xx);
        };
        const near = fox[i] || (x > 0 && fox[i - 1]) || (x < CW - 1 && fox[i + 1]);
        const q = i * 4;
        if (near) {
          const c = col(x);
          const l = col(x - 1);
          const r = col(x + 1);
          o[q] = c[0] * (1 - CA_CELLS) + l[0] * CA_CELLS;
          o[q + 1] = c[1];
          o[q + 2] = c[2] * (1 - CA_CELLS) + r[2] * CA_CELLS;
          o[q + 3] = 255;
        } else if (speck) {
          o[q] = shade[0];
          o[q + 1] = shade[1];
          o[q + 2] = shade[2];
          o[q + 3] = 255;
        } else o[q + 3] = 0;
      }
    }
    out.putImageData(img, 0, 0);
  };
}

// ── Kicked-up snow ─────────────────────────────────────────────────────────
// Each time a pair of paws plants, a few little clumps of snow
// (public/flakes/kicked-up.svg, randomly flipped and spun) flick up from where those paws are,
// arc back behind the fox and drop away, fading out in dither speckles like
// the falling snow does.
const KICK_FLAKES = [{ src: "/flakes/kicked-up.svg", w: 52, h: 55 }];
const KICK_SIZE = [0.5, 0.8]; // flake scale (of its full size)
const KICK_MS = [650, 1000]; // how long a flake is in the air
const KICK_BLUR = 6; // px of blur by the time a flake has dissolved (the falling snow's BLUR)
const KICK_PAD = 14; // room for the blur and dither around each flake (matches .fox-snow padding)

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

// Where a paw is, in rig units, at this moment of the stride: the end of the
// leg, then moved with the body.
function pawAt(pivot: number[], keys: Key[], phase: number, length: number) {
  const [angle, stretch] = sample(keys, phase);
  const L = length * stretch;
  const px = pivot[0] - Math.sin(rad(angle)) * L;
  const py = pivot[1] + Math.cos(rad(angle)) * L;
  const [rise, pitch] = sample(BODY_MOVE, phase, false);
  const dx = px - 175;
  const dy = py - 105;
  return [
    175 + dx * Math.cos(rad(pitch)) - dy * Math.sin(rad(pitch)),
    105 + rise + dx * Math.sin(rad(pitch)) + dy * Math.cos(rad(pitch)),
  ];
}

// `inFront`: the chance each clump flies in front of the fox rather than
// behind it. Near-side paws throw more of theirs forward, far-side ones fewer.
function kick(layer: HTMLElement, x: number, y: number, count: number, inFront: number) {
  for (let n = 0; n < count; n++) {
    const f = KICK_FLAKES[Math.floor(Math.random() * KICK_FLAKES.length)];
    const scale = rand(KICK_SIZE[0], KICK_SIZE[1]);
    const w = f.w * scale;
    const h = f.h * scale;
    const el = document.createElement("div");
    el.className = Math.random() < inFront ? "fox-snow is-front" : "fox-snow";
    el.style.left = `${x + rand(-6, 6) - w / 2 - KICK_PAD}px`;
    el.style.top = `${y - h - KICK_PAD}px`;
    const img = document.createElement("img");
    img.src = f.src;
    img.alt = "";
    img.width = Math.round(w);
    img.height = Math.round(h);
    el.appendChild(img);
    layer.appendChild(el);
    // Up and back (the fox runs right), then down a little as it falls away.
    const back = -rand(14, 42);
    const up = -rand(10, 30);
    const spin = rand(-90, 90);
    // Flip it either way (or both) so the one shape doesn't repeat obviously.
    const flip = Math.random() < 0.5 ? -1 : 1;
    const flipY = Math.random() < 0.5 ? -1 : 1;
    const timing = { duration: rand(KICK_MS[0], KICK_MS[1]), easing: "linear", fill: "forwards" as const };
    const move = el.animate(
      [
        { transform: `translate(0, 0) rotate(0deg) scale(${flip}, ${flipY})`, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
        { transform: `translate(${back * 0.65}px, ${up}px) rotate(${spin * 0.6}deg) scale(${flip}, ${flipY})`, offset: 0.45, easing: "ease-in" },
        { transform: `translate(${back}px, ${up * 0.35 + 6}px) rotate(${spin}deg) scale(${flip}, ${flipY})` },
      ],
      timing,
    );
    // Dissolve like the falling snow (Snowfall.tsx): it blurs as it fades,
    // and the dither on .fox-snow turns that soft cloud into scattering
    // speckles instead of a see-through fade.
    img.animate(
      [
        { opacity: 1, filter: "blur(0px)" },
        { opacity: 1, filter: "blur(0px)", offset: 0.35 },
        { opacity: 0, filter: `blur(${KICK_BLUR}px)` },
      ],
      timing,
    );
    move.onfinish = () => el.remove();
  }
}

function FoxCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const box = canvas?.parentElement;
    const main = box?.closest("main");
    if (!canvas || !box || !main) return;
    // Where the canvas's first row sits below the top of the main panel
    // (layout offsets, so the run's sideways movement doesn't matter).
    const top = box.getBoundingClientRect().top - main.getBoundingClientRect().top;
    const render = makeRenderer(canvas, backgroundRows(top));
    const start = performance.now();
    // Snow is kicked into the first screen itself, so it stays where it was
    // thrown while the fox runs on.
    const hero = box.parentElement!;
    const toHero = (u: number[]) => {
      const b = box.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      return [b.left - h.left + (u[0] - BOX_X) * UNIT, b.top - h.top + (u[1] - VIEW.y) * UNIT];
    };
    let last = 0;
    let raf = 0;
    const frame = (now: number) => {
      const phase = (now - start) / STRIDE_MS;
      render(phase);
      // Paws plant: front pair at the start of each stride, back pair halfway.
      const crossed = (at: number) => Math.floor(last - at) !== Math.floor(phase - at);
      if (crossed(0.02)) {
        kick(hero, ...(toHero(pawAt([194.94, 118.7], LEG_FRONT, phase, 49)) as [number, number]), 2, 0.5);
        kick(hero, ...(toHero(pawAt([220.89, 109.96], LEG_FRONT, phase + 0.12, 57)) as [number, number]), 1, 0.15);
      }
      if (crossed(0.52)) {
        kick(hero, ...(toHero(pawAt([132.89, 117.11], LEG_BACK, phase, 49)) as [number, number]), 2, 0.5);
        kick(hero, ...(toHero(pawAt([166.9, 107.29], LEG_BACK, phase + 0.12, 57)) as [number, number]), 1, 0.15);
      }
      last = phase;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      className="fox-canvas"
      width={CW}
      height={CH}
      style={{ left: (VIEW.x - BOX_X) * UNIT, width: CW * CELL, height: CH * CELL }}
    />
  );
}

export default function Fox() {
  // Each run gets a new key, which remounts the fox and restarts its run.
  const [run, setRun] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (running) return;
    const t = window.setTimeout(
      () => {
        setRun((r) => r + 1);
        setRunning(true);
      },
      between(run === 0 ? FIRST_RUN_MS : BETWEEN_RUNS_MS),
    );
    return () => window.clearTimeout(t);
  }, [running, run]);

  if (!running) return null;
  return (
    <div
      key={run}
      className="fox"
      aria-hidden
      style={runStyle()}
      onAnimationEnd={(e) => e.target === e.currentTarget && setRunning(false)}
    >
      <FoxCanvas />
    </div>
  );
}
