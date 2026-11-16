// SVG filter for an ordered (Bayer) dither: the same 4x4 pattern as the logo
// shadows, at the logos' cell size (2px). Apply it with `filter: url(#dither)`.
//
// Every pixel of the filtered element ends up fully on or off: a pixel shows
// only if its alpha beats that cell's threshold, so soft fades, gradients and
// blur come out as speckles instead of haze. Colours are kept at full strength.
const CELL = 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TILE = CELL * 4;
const THRESHOLDS =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" shape-rendering="crispEdges">` +
      BAYER.map(
        (v, i) =>
          `<rect x="${(i % 4) * CELL}" y="${Math.floor(i / 4) * CELL}" width="${CELL}" height="${CELL}" fill-opacity="${(v + 0.5) / 16}"/>`,
      ).join("") +
      "</svg>",
  );

// ── Pixel art for the 3D iPod: #ipod-pixels and #ipod-shade ────────────────
// PX: size of one "pixel", in CSS px; 2 matches the logos. Both filters share
// this grid, so shading pixels land exactly on colour pixels.
const PX = 1;
const PX_TILE = PX * 2;
// Bayer thresholds, one per PX block (as alpha, like THRESHOLDS above).
const PX_THRESHOLDS =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PX_TILE}" height="${PX_TILE}" shape-rendering="crispEdges">` +
      BAYER.map(
        (v, i) =>
          `<rect x="${(i % 4) * PX}" y="${Math.floor(i / 4) * PX}" width="${PX}" height="${PX}" fill-opacity="${(v + 0.5) / 16}"/>`,
      ).join("") +
      "</svg>",
  );
// One opaque dot near the centre of each block of `size` px: where it's
// sampled. The centre, because the browser draws these pattern images
// slightly soft, so block edges aren't reliable.
const mid = (size: number) => Math.floor(size / 2);
const dot = (size: number) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" shape-rendering="crispEdges">` +
      `<rect x="${mid(size)}" y="${mid(size)}" width="1" height="1"/></svg>`,
  );
// Every offset from the sample to the rest of its block, to copy it across.
const spread = (size: number) =>
  Array.from({ length: size * size }, (_, i) => [(i % size) - mid(size), Math.floor(i / size) - mid(size)]);
// Colour of the shading pixels, and how strong each one is.
const SHADE_COLOR = "#25232C";
const SHADE_OPACITY = 0.32;
// Colours the iPod is drawn with (Figma 53:732 / 53:710, plus the rim). The
// #ipod-palette curves snap every colour channel to the nearest value used by
// these colours (or by them under a shading pixel), so in-between shades from
// edges, scaling and shading collapse onto a small, harsh set: no soft spread
// of colours. Add a colour here if you add one to the iPod.
const PALETTE = [
  "#FFE252", // body
  "#FFC300", // body outline
  "#FFD240", // rim
  "#FFC146", // click wheel
  "#FFD65B", // wheel centre
  "#F9F9F9", // screen, wheel labels
  "#2A2B39", // screen border, eyes
  "#F1364C", // cheeks
  "#F75583", // tongue
  "#9C1B59", // mouth
];
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// Per-channel curves: input 0..255 -> nearest allowed value.
function snapTable(channel: number) {
  const shade = hexRgb(SHADE_COLOR)[channel];
  const allowed = PALETTE.flatMap((c) => {
    const v = hexRgb(c)[channel];
    return [v, Math.round(v * (1 - SHADE_OPACITY) + shade * SHADE_OPACITY)];
  });
  return Array.from({ length: 256 }, (_, i) =>
    (allowed.reduce((best, v) => (Math.abs(v - i) < Math.abs(best - i) ? v : best)) / 255).toFixed(3),
  ).join(" ");
}

// Softening before sampling, so thin lines (the screen border) come out as
// solid pixel rows instead of broken dashes.
const PRE_BLUR = 0.3;

// Pixelate: keep one sample per block and copy it across the block (the
// copies never overlap, so colours stay exact). Blocks are PX by default.
function Pixelate({ in: input, result, size = PX }: { in: string; result: string; size?: number }) {
  return (
    <>
      <feImage href={dot(size)} x="0" y="0" width={size} height={size} result={`${result}-dot`} />
      <feTile in={`${result}-dot`} result={`${result}-dots`} />
      <feComposite in={input} in2={`${result}-dots`} operator="in" result={`${result}-samples`} />
      {spread(size).map(([dx, dy]) => (
        <feOffset key={`${dx}-${dy}`} in={`${result}-samples`} dx={dx} dy={dy} result={`${result}-${dx}-${dy}`} />
      ))}
      <feMerge result={result}>
        {spread(size).map(([dx, dy]) => (
          <feMergeNode key={`${dx}-${dy}`} in={`${result}-${dx}-${dy}`} />
        ))}
      </feMerge>
    </>
  );
}

export default function DitherFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="dither" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        {/* Threshold pattern, tiled across the element. */}
        <feImage href={THRESHOLDS} x="0" y="0" width={TILE} height={TILE} result="cell" />
        <feTile in="cell" result="thresholds" />
        {/* alpha - threshold + 0.5, then snap: on where alpha >= threshold. */}
        <feComposite in="SourceAlpha" in2="thresholds" operator="arithmetic" k2="1" k3="-1" k4="0.5" />
        <feComponentTransfer result="mask">
          <feFuncA type="discrete" tableValues="0 1" />
        </feComponentTransfer>
        {/* Colours at full strength, kept only where the mask is on. */}
        <feComponentTransfer in="SourceGraphic" result="solid">
          <feFuncA type="linear" slope="1000" />
        </feComponentTransfer>
        <feComposite in="solid" in2="mask" operator="in" />
      </filter>

      {/* iPod colours: pixelated into PX blocks of flat colour with hard,
          stepped edges. No dither here, so flat areas stay clean. */}
      <filter id="ipod-pixels" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation={PRE_BLUR} result="soft" />
        <Pixelate in="soft" result="px" />
        <feComponentTransfer>
          <feFuncA type="discrete" tableValues="0 1" />
        </feComponentTransfer>
      </filter>

      {/* iPod shading: the shading copy's darkness (its alpha), ordered-
          dithered into on/off pixels of SHADE_COLOR on the same PX grid, the
          same way the logo shadows are. */}
      <filter id="ipod-shade" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        {/* Threshold first (pure on/off), then pixelate the on/off mask, so the
            faint shading can't build up where pixel copies overlap. */}
        <feImage href={PX_THRESHOLDS} x="0" y="0" width={PX_TILE} height={PX_TILE} result="cell" />
        <feTile in="cell" result="thresholds" />
        <feComposite in="SourceGraphic" in2="thresholds" operator="arithmetic" k2="1" k3="-1" k4="0.5" />
        <feComponentTransfer result="onoff">
          <feFuncA type="discrete" tableValues="0 1" />
        </feComponentTransfer>
        <Pixelate in="onoff" result="mask" />
        <feFlood floodColor={SHADE_COLOR} floodOpacity={SHADE_OPACITY} />
        <feComposite in2="mask" operator="in" />
      </filter>

      {/* Curves over the whole iPod (both layers): snaps colours to PALETTE. */}
      <filter id="ipod-palette" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues={snapTable(0)} />
          <feFuncG type="discrete" tableValues={snapTable(1)} />
          <feFuncB type="discrete" tableValues={snapTable(2)} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}
