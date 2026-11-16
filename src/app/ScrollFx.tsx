"use client";

import { useEffect } from "react";

// How far you scroll (as a fraction of the window height) for the main panel
// to grow from its inset to the full width of the window.
const SPAN = 0.25;

// Slides the side gutters (.frame-gutter, globals.css) out past the window
// edges as you scroll, so the main panel appears to grow to full width;
// scrolling back up slides them in. Only transforms change, set directly on
// the two strips, so nothing else on the page is restyled or re-laid out.
const INSET = 16; // px; the gutter width (1rem)
export default function ScrollFx() {
  useEffect(() => {
    const left = document.querySelector<HTMLElement>(".frame-gutter.is-left");
    const right = document.querySelector<HTMLElement>(".frame-gutter.is-right");
    let raf = 0;
    const update = () => {
      raf = 0;
      const t = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * SPAN)));
      const p = t * t * (3 - 2 * t); // ease in and out
      const x = (p * INSET).toFixed(2);
      if (left) left.style.transform = `translate3d(-${x}px, 0, 0)`;
      if (right) right.style.transform = `translate3d(${x}px, 0, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return null;
}
