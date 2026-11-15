// WebGL2 renderer for the pixelated logos.
//
// Each logo (cast shadow, dark back layer, coloured front layer) is drawn into a
// deliberately low-resolution canvas: one canvas pixel = PIXEL CSS pixels on
// screen, upscaled with nearest-neighbour so every cell is a hard square.
// Every cell is fully opaque:
//   - logo layers: alpha is thresholded at 50%, colour is the mip-averaged
//     colour of the artwork under that cell (no soft/see-through edges)
//   - shadow: its soft density is turned into on/off pixels with an ordered
//     (Bayer) dither, so it reads as a speckled print shadow, not a grey haze
//
// Empty canvas pixels show the page background, including the sky gradient
// (sky.ts), so the canvas box blends in wherever it sits on the page.
//
// Motion mirrors the CSS keyframes in globals.css (same values and easings).

import { SKY } from "../sky";

export const PIXEL = 2; // CSS px per pixel cell (REGION w/h must divide by this)
// Chromatic aberration: red is shifted this many cells left, blue the same right.
// Fractions work (e.g. 0.5 = a softer, half-strength fringe); each cell is still
// one solid colour, it's just a blend of the two neighbouring cells.
const CA_CELLS = 0.5;
// Region of the stage the canvas covers, in stage px. The stage is a row of
// 222px Figma frames (see LOGOS). It extends left of the first frame because
// shadows stretch that way.
export const REGION = { x: -99, y: 0, w: 1200, h: 222 };
// Width of the laid-out row of logos (used for centring the stage).
export const STAGE_W = 1099;

const PERSPECTIVE = 800;
const SHADOW_SKEW_DEG = 68;
const SHADOW_SQUASH = 0.32;
// Shadow is drawn in a lighter tone of the silhouette colour, at higher density,
// so the dither reads as soft rather than noisy.
const SHADOW_RGB: [number, number, number] = [0.6, 0.61, 0.66];
const SHADOW_DENSITY_GAIN = 1 / 0.45;

// ---------- easing / keyframes ----------

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid;
      else hi = mid;
    }
    return by((lo + hi) / 2);
  };
}

const sway = cubicBezier(0.45, 0, 0.55, 1);
const rise = cubicBezier(0.33, 0, 0.4, 1);
const fall = cubicBezier(0.6, 0, 0.67, 1);

type Frame = { at: number; v: number[]; ease?: (x: number) => number };

function track(frames: Frame[]) {
  return (t: number) => {
    let i = 0;
    while (i < frames.length - 2 && t >= frames[i + 1].at) i++;
    const a = frames[i];
    const b = frames[i + 1];
    const p = (a.ease ?? ((x: number) => x))((t - a.at) / (b.at - a.at));
    return a.v.map((av, k) => av + (b.v[k] - av) * p);
  };
}

// Turn out to [translateX px, rotateY deg] at the halfway point and back.
const swayTo = (tx: number, deg: number) =>
  track([
    { at: 0, v: [0, 0], ease: sway },
    { at: 0.5, v: [tx, deg], ease: sway },
    { at: 1, v: [0, 0] },
  ]);

type Layer = { src: string; origin: [number, number]; sway: (t: number) => number[] };
type LogoDef = {
  x: number; // left of this logo's 222px frame within the stage
  name: string; // shown in the hover label
  top: number; // top edge of the artwork in its frame (the label sits above it)
  left: number; // left edge of the artwork in its frame (for the hover area)
  right: number; // right edge of the artwork in its frame (for the index number)
  y: number; // vertical offset so every logo's base sits on the same ground line
  cycle: number; // ms for one full turn out and back (each logo runs its own loop)
  phase: number; // 0..1 starting point in that loop, so they don't start in step
  back: Layer;
  front: Layer;
  shadow: {
    src: string;
    px: [number, number];
    box: { x: number; y: number; w: number; h: number };
    length?: number; // 0..1 multiplier on how far the shadow stretches (default 1)
  };
};

// Turn amounts come from each logo's Figma "Not-Rotated" -> "Rotated" frames:
// how much each layer narrows (cos of the angle) and how far its centre moves.
const LOGOS: LogoDef[] = [
  {
    // Apple: front 99.5 -> 86px wide, +4.25px; back 104.4 -> 97.3px, +0.5px
    x: 0,
    name: "Apple",
    top: 46,
    left: 56,
    right: 162,
    y: 0, // base at y≈174 in its frame: this is the ground line
    cycle: 6000,
    phase: 0,
    back: { src: "/logo-back.svg", origin: [108.2, 110], sway: swayTo(0.5, 21) },
    front: { src: "/logo-front.svg", origin: [112.75, 110], sway: swayTo(4.25, 30) },
    shadow: { src: "/logo-shadow.png", px: [436, 526], box: { x: 56, y: 48, w: 104.4, h: 126 } },
  },
  {
    // EA: front 168 -> 133px wide, +4.5px; back 172 -> 153px, +0.5px
    x: 226,
    name: "Electronic Arts",
    top: 68,
    left: 30,
    right: 198,
    y: 20.3, // base at y≈153.7 in its frame -> drop to 174
    cycle: 6700,
    phase: 0.35,
    back: { src: "/ea-back.svg", origin: [110, 111], sway: swayTo(0.5, 27) },
    front: { src: "/ea-front.svg", origin: [114, 111], sway: swayTo(4.5, 38) },
    shadow: { src: "/ea-shadow.png", px: [704, 360], box: { x: 24, y: 68, w: 172, h: 86 } },
  },
  {
    // Bolt: front 48 -> 43px wide (≈27°), +2.75px; back keeps its width and
    // slides -1.5px. Frames are placed so every logo has a ~90px gap.
    x: 429,
    name: "SFU Surge",
    top: 49,
    left: 83,
    right: 137.3,
    y: 2, // base at y≈172 in its frame -> drop to 174
    cycle: 5400,
    phase: 0.6,
    back: { src: "/bolt-back.svg", origin: [110.17, 110.5], sway: swayTo(-1.5, 0) },
    front: { src: "/bolt-front.svg", origin: [112.57, 110.6], sway: swayTo(2.75, 27) },
    // Silhouette made from the back layer (bolt-back.svg cropped tight).
    shadow: { src: "/bolt-shadow.svg", px: [218, 492], box: { x: 83, y: 49, w: 54.34, h: 123 } },
  },
  {
    // Snowflakes: front 108.8 -> 99.8px wide (≈23.5°), +5.1px; back keeps its
    // width and stays put.
    x: 604,
    name: "Symposium 2026",
    top: 54.4,
    left: 52.4,
    right: 167.7,
    y: 6.8, // base at y≈167.2 in its frame -> drop to 174
    cycle: 7300,
    phase: 0.15,
    back: { src: "/snow-back.svg", origin: [110.04, 110.8], sway: swayTo(0, 0) },
    front: { src: "/snow-front.svg", origin: [112.4, 110.8], sway: swayTo(5.1, 23.5) },
    shadow: { src: "/snow-shadow.png", px: [286, 280], box: { x: 52.4, y: 54.4, w: 115.3, h: 112.8 } },
  },
  {
    // Thoughts (notepad): back 94 -> 87.9px wide (≈21°), +5px;
    // front 88.3 -> 74.8px (≈32°), +7.5px. Sits past the divider (DIVIDERS).
    x: 877,
    name: "Thoughts",
    top: 54.5,
    left: 58.7,
    right: 156.7,
    y: 5.7, // base at y≈168.3 in its frame -> drop to 174
    cycle: 6200,
    phase: 0.8,
    back: { src: "/thoughts-back.svg", origin: [107.7, 111], sway: swayTo(5, 21) },
    front: { src: "/thoughts-front.svg", origin: [109.5, 111], sway: swayTo(7.5, 32) },
    // Silhouette made from the back layer (thoughts-back.svg cropped tight).
    shadow: {
      src: "/thoughts-shadow.svg",
      px: [196, 228],
      box: { x: 58.7, y: 54.5, w: 98, h: 113.8 },
      length: 0.6, // shorter than the others: a tall block casts a long one
    },
  },
];
// Opacity of the other logos while one is hovered, and how quickly it eases.
const DIM = 0.35;
const FADE_MS = 90; // time constant: ~90% of the way there in ~200ms
const BLUR_LEVELS = 1; // how blurred the other logos get (mip levels; ~3x softer)
const SHADOW_BLUR_PX = 3; // extra blur on their shadows

// Thin vertical divider lines between groups of logos: x in stage px.
// One sits midway between Symposium 2026 (4) and Thoughts (5).
export const DIVIDERS = [854];

// Shared ground line every logo's base sits on, in stage px.
export const GROUND_Y = 174;
// Where each logo's artwork ends on the right, in stage px.
export const LOGO_RIGHTS = LOGOS.map((l) => l.x + l.right);
// Hover label anchor for each logo, in stage px: centred over the artwork,
// at the top of it (y offset included so it matches what's drawn).
export const LOGO_LABELS = LOGOS.map((l) => ({ name: l.name, x: l.x + (l.left + l.right) / 2, y: l.y + l.top }));
// Hover area for each logo, in stage px: its artwork from the top of the
// tallest logo down to the ground.
export const LOGO_HITS = LOGOS.map((l) => ({ left: l.x + l.left, width: l.right - l.left, top: 40, height: GROUND_Y - 40 }));

// [translateY px]
const bounce = track([
  { at: 0, v: [0], ease: rise },
  { at: 0.25, v: [-6], ease: fall },
  { at: 0.5, v: [0], ease: rise },
  { at: 0.75, v: [-6], ease: fall },
  { at: 1, v: [0] },
]);
// [translateX, translateY, scaleX, opacity, blur px]
const cast = track([
  { at: 0, v: [0, 0, 1, 0.38, 2.5], ease: rise },
  { at: 0.25, v: [-18, -2, 0.95, 0.26, 4], ease: fall },
  { at: 0.5, v: [-1, 0, 0.88, 0.38, 2.5], ease: rise },
  { at: 0.75, v: [-18, -2, 0.92, 0.26, 4], ease: fall },
  { at: 1, v: [0, 0, 1, 0.38, 2.5] },
]);

// ---------- 4x4 matrices (column-major) ----------

type Mat = Float32Array;
const ident = (): Mat => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function mul(a: Mat, b: Mat): Mat {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}
const chain = (...ms: Mat[]) => ms.reduce((acc, m) => mul(acc, m));
function translate(x: number, y: number): Mat {
  const m = ident();
  m[12] = x;
  m[13] = y;
  return m;
}
function scale(x: number, y: number): Mat {
  const m = ident();
  m[0] = x;
  m[5] = y;
  return m;
}
function skewX(deg: number): Mat {
  const m = ident();
  m[4] = Math.tan((deg * Math.PI) / 180);
  return m;
}
function rotateY(deg: number): Mat {
  const r = (deg * Math.PI) / 180;
  const m = ident();
  m[0] = Math.cos(r);
  m[2] = -Math.sin(r);
  m[8] = Math.sin(r);
  m[10] = Math.cos(r);
  return m;
}
function perspective(d: number): Mat {
  const m = ident();
  m[11] = -1 / d;
  return m;
}
// Stage px -> clip space for the canvas region. Z is flattened so nothing clips.
function toClip(): Mat {
  const m = new Float32Array(16);
  m[0] = 2 / REGION.w;
  m[12] = -(2 * REGION.x) / REGION.w - 1;
  m[5] = -2 / REGION.h;
  m[13] = (2 * REGION.y) / REGION.h + 1;
  m[15] = 1;
  return m;
}

// ---------- GL setup ----------

const VERT = `#version 300 es
in vec2 aUnit;
uniform vec4 uRect;
uniform mat4 uM;
out vec2 vUv;
void main() {
  vUv = aUnit;
  gl_Position = uM * vec4(uRect.xy + aUnit * uRect.zw, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform int uMode;          // 0 = logo layer, 1 = shadow
uniform float uOpacity;
uniform vec2 uBlur;         // blur radius in uv
uniform vec3 uShadowColor;
uniform float uAlpha;       // whole-logo opacity (dimmed while another logo is hovered)
uniform float uSoft;        // extra mip levels to blur a logo by (0 = sharp)
uniform float uGain;
out vec4 outColor;

float bayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int idx = i.x + i.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[idx]) + 0.5) / 16.0;
}

void main() {
  if (uMode == 0) {
    // Premultiplied. uSoft samples a smaller mip level, which blurs the artwork;
    // its soft edge is then dithered (like the shadows) rather than cut at 50%.
    vec4 c = texture(uTex, vUv, uSoft);
    float edge = mix(0.5, bayer4(gl_FragCoord.xy), clamp(uSoft, 0.0, 1.0));
    if (c.a < edge || c.a <= 0.0) discard;
    outColor = vec4(c.rgb / c.a, uAlpha);
    return;
  }
  // Shadow: soft density -> dithered solid pixels.
  float a = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++)
      a += texture(uTex, vUv + vec2(x, y) * uBlur).a;
  a /= 9.0;
  float d = 1.0 - vUv.y;                   // 0 at the apple's base, 1 at the far end
  float mask = d < 0.6 ? mix(1.0, 0.35, d / 0.6) : mix(0.35, 0.0, (d - 0.6) / 0.4);
  float density = clamp(a * mask * uOpacity * uGain, 0.0, 1.0);
  if (density <= bayer4(gl_FragCoord.xy)) discard;
  outColor = vec4(uShadowColor, uAlpha);
}`;

// Post pass: reads the low-res scene and splits the colour channels sideways.
const POST_VERT = `#version 300 es
in vec2 aUnit;
void main() { gl_Position = vec4(aUnit * 2.0 - 1.0, 0.0, 1.0); }`;

const POST_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform float uShift;
// Page background behind the canvas: sky stops (rgb, position as a fraction
// of viewport height), then the plain background colour.
uniform vec4 uSky[${SKY.length}];
uniform vec3 uBg;
uniform float uTop;      // canvas top, px below where the sky gradient starts
uniform float uVh;       // viewport height, px
uniform float uCell;     // CSS px per cell
out vec4 outColor;
vec3 sky(int row) {
  float t = (uTop + (float(row) + 0.5) * uCell) / uVh;
  if (t <= uSky[0].a) return uSky[0].rgb;
  for (int i = 1; i < ${SKY.length}; i++)
    if (t <= uSky[i].a) return mix(uSky[i - 1].rgb, uSky[i].rgb, (t - uSky[i - 1].a) / (uSky[i].a - uSky[i - 1].a));
  return uBg;
}
vec3 at(ivec2 p) {
  ivec2 size = textureSize(uScene, 0);
  p = clamp(p, ivec2(0), size - 1);
  vec4 c = texelFetch(uScene, p, 0);
  // Drawn cells sit over the page background at their opacity; empty cells
  // (alpha 0) just show the background.
  return c.a > 0.0 ? mix(sky(size.y - 1 - p.y), c.rgb, c.a) : sky(size.y - 1 - p.y);
}
// Horizontal sample at a fractional cell offset: blends the two cells it falls
// between, so e.g. 0.5 gives a half-strength fringe. Output stays one solid
// colour per cell.
vec3 atX(ivec2 p, float dx) {
  float f = floor(dx);
  ivec2 q = p + ivec2(int(f), 0);
  return mix(at(q), at(q + ivec2(1, 0)), dx - f);
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  outColor = vec4(atX(p, -uShift).r, at(p).g, atX(p, uShift).b, 1.0);
}`;

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "aUnit");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
  return p;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function loadTexture(gl: WebGL2RenderingContext, src: string, w: number, h: number) {
  const img = await loadImage(src);
  // Rasterise (SVGs especially) at a fixed, generous size before uploading.
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** An element's background colour as 0..1 RGB, or null while styles are still loading. */
function pageBackground(el: Element) {
  const parts = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
  if (!parts || parts.length < 3 || (parts.length > 3 && Number(parts[3]) === 0)) return null;
  return parts.slice(0, 3).map((n) => Number(n) / 255);
}

/** Starts rendering into `canvas`. Returns a stop function, or null if WebGL2 is unavailable. */
export async function startLogoScene(canvas: HTMLCanvasElement, opts: { animate: boolean }) {
  // alpha: true so the canvas is transparent (not black) while textures load.
  // Every rendered frame writes opaque pixels, so the final look is unchanged.
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true });
  if (!gl) return null;

  const prog = program(gl, VERT, FRAG);
  const post = program(gl, POST_VERT, POST_FRAG);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Offscreen target the scene is drawn into before the aberration pass.
  const sceneTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(post);
  gl.uniform1i(gl.getUniformLocation(post, "uScene"), 0);
  gl.uniform1f(gl.getUniformLocation(post, "uShift"), CA_CELLS);
  gl.uniform4fv(
    gl.getUniformLocation(post, "uSky"),
    SKY.flatMap((s) => [...hexRgb(s.color), s.at]),
  );
  gl.uniform1f(gl.getUniformLocation(post, "uCell"), PIXEL);
  const uPostBg = gl.getUniformLocation(post, "uBg");
  const uTop = gl.getUniformLocation(post, "uTop");
  const uVh = gl.getUniformLocation(post, "uVh");

  gl.useProgram(prog);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uRect = u("uRect");
  const uM = u("uM");
  const uMode = u("uMode");
  const uOpacity = u("uOpacity");
  const uBlur = u("uBlur");
  const uAlpha = u("uAlpha");
  const uSoft = u("uSoft");
  gl.uniform1i(u("uTex"), 0);
  gl.uniform3fv(u("uShadowColor"), SHADOW_RGB);
  gl.uniform1f(u("uGain"), SHADOW_DENSITY_GAIN);

  const textures = await Promise.all(
    LOGOS.map(async (l) => {
      const [shadow, back, front] = await Promise.all([
        loadTexture(gl, l.shadow.src, l.shadow.px[0], l.shadow.px[1]),
        loadTexture(gl, l.back.src, 888, 888),
        loadTexture(gl, l.front.src, 888, 888),
      ]);
      return { shadow, back, front };
    }),
  );

  const clip = toClip();

  function drawLayer(tex: WebGLTexture, frameX: number, frameY: number, origin: [number, number], tx: number, deg: number, bob: number) {
    const m = chain(
      clip,
      translate(frameX, frameY + bob),
      translate(origin[0], origin[1]),
      perspective(PERSPECTIVE),
      translate(tx, 0),
      rotateY(deg),
      translate(-origin[0], -origin[1]),
    );
    gl!.uniformMatrix4fv(uM, false, m);
    gl!.uniform4f(uRect, 0, 0, 222, 222);
    gl!.uniform1i(uMode, 0);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function drawShadow(logo: LogoDef, tex: (typeof textures)[number], t: number) {
    const box = logo.shadow.box;
    const [ctx, cty, csx, cop, cblur] = cast(t);
    const ox = box.x + box.w / 2;
    const oy = box.y + box.h;
    gl!.uniformMatrix4fv(
      uM,
      false,
      chain(
        clip,
        translate(logo.x, logo.y),
        translate(ox, oy),
        translate(ctx, cty),
        skewX(SHADOW_SKEW_DEG),
        scale(csx, SHADOW_SQUASH * (logo.shadow.length ?? 1)),
        translate(-ox, -oy),
      ),
    );
    gl!.uniform4f(uRect, box.x, box.y, box.w, box.h);
    gl!.uniform1i(uMode, 1);
    gl!.uniform1f(uOpacity, cop);
    gl!.uniform2f(uBlur, (cblur + shadowBlurBoost) / box.w, (cblur + shadowBlurBoost) / box.h);
    gl!.bindTexture(gl!.TEXTURE_2D, tex.shadow);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function drawLogo(logo: LogoDef, tex: (typeof textures)[number], t: number) {
    const [bob] = bounce(t);
    const [btx, bdeg] = logo.back.sway(t);
    const [ftx, fdeg] = logo.front.sway(t);
    drawLayer(tex.back, logo.x, logo.y, logo.back.origin, btx, bdeg, bob);
    drawLayer(tex.front, logo.x, logo.y, logo.front.origin, ftx, fdeg, bob);
  }

  // Below the sky the panel is plain --background (globals.css). Re-read every
  // frame so it stays in sync if the colour changes while the page is open;
  // ignore it while styles are still loading.
  let bg = [1, 1, 1];
  // The panel the logos sit on (the framed <main>); its background and sky
  // gradient are what the canvas has to match.
  const panel = canvas.closest("main") ?? document.body;
  const readBackground = () => (bg = pageBackground(panel) ?? bg);

  // Hover focus: while one logo is focused the others ease out of the way:
  // they slow to a stop, fade to DIM opacity and blur. `dim[i]` runs 0..1.
  const dim = LOGOS.map(() => 0);
  let focus: number | null = null;
  const target = (i: number) => (focus === null || focus === i ? 0 : 1);
  // Eases each logo's dim amount toward its target; returns true while still moving.
  function stepFade(dt: number) {
    const k = 1 - Math.exp(-dt / FADE_MS);
    let moving = false;
    dim.forEach((d, i) => {
      const next = d + (target(i) - d) * k;
      dim[i] = Math.abs(target(i) - next) < 0.002 ? target(i) : next;
      if (dim[i] !== target(i)) moving = true;
    });
    return moving;
  }

  // Each logo keeps its own clock, which runs slower as it dims and stops
  // when fully dimmed, so paused logos pick up exactly where they left off.
  const clock = LOGOS.map(() => 0);
  const advance = (dt: number) => dim.forEach((d, i) => (clock[i] += dt * (1 - d)));

  // Turn progress 0..1 for logo i; `still` gives the rest pose (reduced motion).
  const progress = (i: number, still: boolean) => (still ? 0 : (clock[i] / LOGOS[i].cycle + LOGOS[i].phase) % 1);

  let shadowBlurBoost = 0;
  function setLook(i: number) {
    gl!.uniform1f(uAlpha, 1 - dim[i] * (1 - DIM));
    gl!.uniform1f(uSoft, dim[i] * BLUR_LEVELS);
    shadowBlurBoost = dim[i] * SHADOW_BLUR_PX;
  }

  function render(still: boolean) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.useProgram(prog);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    readBackground();
    // Transparent: the post pass fills empty cells with the page background.
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);

    // All shadows first, so one logo's shadow never draws over a neighbouring logo.
    LOGOS.forEach((logo, i) => {
      setLook(i);
      drawShadow(logo, textures[i], progress(i, still));
    });
    LOGOS.forEach((logo, i) => {
      setLook(i);
      drawLogo(logo, textures[i], progress(i, still));
    });

    // Aberration pass to the screen.
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.useProgram(post);
    gl!.uniform3fv(uPostBg, bg);
    // Canvas top relative to where the panel's gradient starts (inside its border).
    gl!.uniform1f(uTop, canvas.getBoundingClientRect().top - (panel.getBoundingClientRect().top + panel.clientTop));
    gl!.uniform1f(uVh, window.innerHeight);
    gl!.bindTexture(gl!.TEXTURE_2D, sceneTex);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0;
  let wake = () => {};
  if (opts.animate) {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      stepFade(dt);
      advance(dt);
      last = now;
      render(false);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } else {
    // Still pose: only redraw while a hover fade is running.
    let last = 0;
    const fadeLoop = (now: number) => {
      const moving = stepFade(last ? now - last : 16);
      last = now;
      render(true);
      raf = moving ? requestAnimationFrame(fadeLoop) : 0;
    };
    wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(fadeLoop);
      }
    };
    render(true);
  }
  return {
    stop: () => cancelAnimationFrame(raf),
    /** Emphasise logo `i` (others pause, fade and blur), or null to show all normally. */
    setFocus(i: number | null) {
      focus = i;
      wake();
    },
  };
}
