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
    </svg>
  );
}
