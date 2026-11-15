// Sky gradient at the top of the main panel: blue fading through lavender into
// the page background. Positions are fractions of the viewport height, measured
// from the top of the panel. Past the last stop it's the plain --background.
//
// Used in two places that must agree: the panel background (skyCss, applied in
// page.tsx) and the logo canvas, which paints the same gradient behind the
// logos so its box never shows (logo/scene.ts).
export const SKY: { at: number; color: string }[] = [
  { at: 0, color: "#C3D4F8" },
  { at: 0.075, color: "#C3D4F8" },
  { at: 0.185, color: "#E2E1F5" },
  { at: 0.28, color: "#F1EDF5" },
  { at: 0.37, color: "#F9F9F9" },
];

export const skyCss = () =>
  `linear-gradient(to bottom, ${SKY.map((s) => `${s.color} ${s.at * 100}vh`).join(", ")}, var(--background) ${SKY[SKY.length - 1].at * 100}vh)`;
