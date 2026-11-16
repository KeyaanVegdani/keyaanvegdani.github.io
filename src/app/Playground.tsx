"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isMuted } from "./sound";

/* eslint-disable @next/next/no-img-element */

// ─── Playground spread ─────────────────────────────────────────────────────
// The scattered pile of playground cards under the first screen (Figma 46:4198).
// Laid out on the 1512-wide Figma frame and scaled with the page width.
// Each card: [centre x, centre y] in Figma px, rotation in degrees, a title,
// a date, and optionally:
//   src          an image, or a video (.mp4/.webm/.mov), put in /public
//   description  the line under the media in the gallery view
//   href         where the gallery's top-right icon links to (new tab)
// Later cards sit on top of earlier ones.
type Item = {
  x: number;
  y: number;
  rot: number;
  title: string;
  date: string;
  src?: string;
  description?: string;
  href?: string;
};

const DEFAULT_DESCRIPTION = "Short description of the work goes here. Usually about this long.";

const FRAME_W = 1512;
const FRAME_H = 1160;

const ITEMS: Item[] = [
  { x: 260.1, y: 248.3, rot: -3.36, title: "Playground Item", date: "May 26’" },
  { x: 771.6, y: 270.2, rot: -3.36, title: "Playground Item", date: "May 26’" },
  { x: 1230.6, y: 252.2, rot: 12.37, title: "Playground Item", date: "May 26’" },
  { x: 553.8, y: 387.9, rot: 16.62, title: "Playground Item", date: "May 26’" },
  { x: 272.9, y: 538.8, rot: -11.87, title: "Playground Item", date: "May 26’" },
  { x: 797.1, y: 572.0, rot: -4.11, title: "Playground Item", date: "May 26’" },
  { x: 502.1, y: 726.0, rot: 8.11, title: "Playground Item", date: "May 26’" },
  { x: 1103.1, y: 396.5, rot: -13.59, title: "Playground Item", date: "May 26’" },
  { x: 1228.5, y: 577.7, rot: 10.69, title: "Playground Item", date: "May 26’" },
  { x: 1026.9, y: 725.6, rot: -12.84, title: "Playground Item", date: "May 26’" },
  { x: 765.9, y: 886.6, rot: 3.89, title: "Playground Item", date: "May 26’" },
  { x: 253.8, y: 926.1, rot: 20.62, title: "Playground Item", date: "May 26’" },
  { x: 1252.8, y: 922.2, rot: -8.73, title: "Playground Item", date: "May 26’" },
];

const isVideo = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

// Like the logo labels: while hovered, a card leans a little toward the
// cursor. --follow-x/--follow-y go from -1 to 1 across the card, measured
// from the card's resting spot (not where it has moved to) so it can't
// chase itself. null recentres it.
const follow = (e: React.PointerEvent<HTMLElement> | null) => {
  const el = e?.currentTarget;
  if (!el) return;
  const section = el.parentElement!.getBoundingClientRect();
  const cx = section.left + (parseFloat(el.style.left) / 100) * section.width;
  const cy = section.top + (parseFloat(el.style.top) / 100) * section.height;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const x = clamp((e.clientX - cx) / (el.offsetWidth / 2));
  const y = clamp((e.clientY - cy) / (el.offsetHeight / 2));
  el.style.setProperty("--follow-x", x.toFixed(3));
  el.style.setProperty("--follow-y", y.toFixed(3));
};
const unfollow = (e: React.PointerEvent<HTMLElement>) => {
  e.currentTarget.style.setProperty("--follow-x", "0");
  e.currentTarget.style.setProperty("--follow-y", "0");
};

// ─── Gallery view (Figma 63:356) ───────────────────────────────────────────
// Clicking a card lifts it out of the pile into a big centred card, while the
// page behind scales down, blurs and fades. The arrows send the open card
// back to its spot and pull the next one up; clicking anywhere outside the
// card (or Escape) puts it back and closes the gallery.
//
// The moving card is a copy drawn in a layer over the page (the page itself
// is blurred); the real card hides while its copy is out.

const GALLERY_MS = 550; // keep in step with --gallery-ms in globals.css
const BEHIND_SCALE = 0.9; // how far the page shrinks behind the gallery

type Box = { x: number; y: number; w: number; h: number; rot: number };
// behind: the card is (or is heading) back in the blurred pile behind the
// gallery, so it fades and blurs to match it on the way.
type Flight = { key: number; i: number; box: Box; open: boolean; behind: boolean };

// Where card i sits on screen with the page scaled by `scale` around the
// middle of the window. Worked out from layout offsets (which ignore
// transforms) so it's right even while the page is mid-animation.
function slot(i: number, scale: number): Box | null {
  const el = document.querySelectorAll<HTMLElement>(".playground-card")[i];
  const section = el?.offsetParent as HTMLElement | null;
  const main = section?.offsetParent as HTMLElement | null;
  if (!el || !section || !main) return null;
  // The card is centred on its left/top (translate -50%), plus the squeeze.
  const [tx = 0, ty = 0] = (getComputedStyle(el).translate || "")
    .split(" ")
    .map((v) => parseFloat(v) || 0);
  const x = main.offsetLeft + section.offsetLeft + el.offsetLeft + tx - window.scrollX;
  const y = main.offsetTop + section.offsetTop + el.offsetTop + ty - window.scrollY;
  const ox = window.innerWidth / 2;
  const oy = window.innerHeight / 2;
  return {
    x: ox + (x - ox) * scale,
    y: oy + (y - oy) * scale,
    w: el.offsetWidth * scale,
    h: el.offsetHeight * scale,
    rot: ITEMS[i].rot,
  };
}

// The big card: 754 x 632 in the Figma, a touch below centre, shrunk to fit
// smaller windows.
function galleryBox(): Box {
  const w = Math.min(754, window.innerWidth - 48);
  const h = Math.min(632, window.innerHeight - 190);
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 + 3, w, h, rot: 0 };
}

const nextFrame = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));

function GalleryIcon() {
  // Starts as the hover arrow; the corner lines draw in once the card is open.
  return (
    <svg className="gallery-icon" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        className="gallery-icon-lines"
        d="M0.8 1.8V9.2H8.2"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.19 0h.07c.2 0 .38.07.53.22.14.15.21.32.21.53v.06c0 .02 0 .03-.02.05v3.65c0 .2-.07.38-.22.53a.7.7 0 0 1-.53.22.7.7 0 0 1-.52-.22.7.7 0 0 1-.22-.53V2.56L5.29 5.78a1 1 0 0 1-.25.15.7.7 0 0 1-.3.07.7.7 0 0 1-.53-.22A.7.7 0 0 1 4 5.26c0-.1.02-.2.06-.3a1 1 0 0 1 .15-.25l3.22-3.2H5.49a.7.7 0 0 1-.53-.22.7.7 0 0 1-.22-.52c0-.21.07-.39.22-.53.15-.14.32-.22.53-.22h3.65c.02-.01.03-.02.05-.02Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Media({ item }: { item: Item }) {
  if (!item.src) return null;
  return isVideo(item.src) ? (
    <video src={item.src} autoPlay muted loop playsInline />
  ) : (
    <img src={item.src} alt={item.title} draggable={false} />
  );
}

export default function Playground() {
  // The pile starts squeezed in toward its middle and springs out to the
  // full spread once the section top is 40% of the way up the screen
  // (and squeezes back if you scroll above that again).
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOpen(entry.isIntersecting), {
      rootMargin: "0px 0px -40% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Gallery: which card is open (null = closed) and the cards in flight.
  const [active, setActive] = useState<number | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const keyRef = useRef(0);
  // Mirror of `active` for the handlers, kept in step by choose().
  const activeRef = useRef<number | null>(null);
  const choose = useCallback((i: number | null) => {
    activeRef.current = i;
    setActive(i);
  }, []);

  // Sound when a card opens or the gallery swaps cards. Each play is its own
  // copy so quick swaps overlap instead of cutting each other off.
  // Closing plays its own sound.
  const openSoundRef = useRef<HTMLAudioElement | null>(null);
  const closeSoundRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const load = (src: string) => {
      const a = new Audio(src);
      a.preload = "auto";
      return a;
    };
    openSoundRef.current = load("/playground/open.mp3");
    closeSoundRef.current = load("/playground/close.mp3");
  }, []);
  const play = (a: HTMLAudioElement | null) => {
    if (!a || isMuted()) return;
    (a.cloneNode() as HTMLAudioElement).play().catch(() => {});
  };
  const playOpen = useCallback(() => play(openSoundRef.current), []);
  // Paper rustle on hovering a card: one of four at random, never the same
  // one twice in a row.
  const hoverSoundsRef = useRef<HTMLAudioElement[]>([]);
  const lastHoverRef = useRef(-1);
  useEffect(() => {
    hoverSoundsRef.current = [1, 2, 3, 4].map((n) => {
      const a = new Audio(`/playground/hover-${n}.mp3`);
      a.preload = "auto";
      return a;
    });
  }, []);
  const playHover = (e: React.PointerEvent) => {
    const sounds = hoverSoundsRef.current;
    if (e.pointerType !== "mouse" || activeRef.current !== null || !sounds.length) return;
    let n = Math.floor(Math.random() * sounds.length);
    if (n === lastHoverRef.current) n = (n + 1) % sounds.length;
    lastHoverRef.current = n;
    play(sounds[n]);
  };
  const playClose = useCallback(() => play(closeSoundRef.current), []);

  // Sends the open card back to its spot in the pile (page scaled by
  // `scale` when it lands), then drops its copy so the real one shows.
  const sendBack = useCallback((i: number, scale: number) => {
    const to = slot(i, scale);
    setFlights((fs) =>
      fs.map((f) =>
        f.i === i && f.open ? { ...f, open: false, behind: scale !== 1, box: to ?? f.box } : f,
      ),
    );
    window.setTimeout(() => setFlights((fs) => fs.filter((f) => f.i !== i || f.open)), GALLERY_MS);
  }, []);

  // Lifts card i out of the pile (page currently scaled by `scale`).
  const bringUp = useCallback((i: number, scale: number, start?: Box) => {
    const from = start ?? slot(i, scale);
    if (!from) return;
    const key = ++keyRef.current;
    setFlights((fs) => [
      ...fs.filter((f) => f.i !== i),
      { key, i, box: from, open: false, behind: scale !== 1 },
    ]);
    nextFrame(() =>
      setFlights((fs) => fs.map((f) => (f.key === key ? { ...f, box: galleryBox(), open: true, behind: false } : f))),
    );
    choose(i);
  }, [choose]);

  const openAt = (i: number) => {
    if (activeRef.current !== null) return;
    playOpen();
    const main = document.querySelector<HTMLElement>("main");
    if (main) {
      // Shrink toward the middle of the window, wherever the page is scrolled.
      main.style.transformOrigin = `${window.innerWidth / 2 - main.offsetLeft + window.scrollX}px ${
        window.innerHeight / 2 - main.offsetTop + window.scrollY
      }px`;
      main.classList.add("is-behind-gallery");
    }
    document.documentElement.classList.add("is-gallery-open");
    // Start from where the card is right now (lifted by the hover), so it
    // doesn't jump.
    const el = document.querySelectorAll<HTMLElement>(".playground-card")[i];
    const r = el.getBoundingClientRect();
    bringUp(i, 1, {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      w: el.offsetWidth,
      h: el.offsetHeight,
      rot: ITEMS[i].rot,
    });
  };

  const close = useCallback(() => {
    const i = activeRef.current;
    if (i === null) return;
    playClose();
    document.querySelector("main")?.classList.remove("is-behind-gallery");
    document.documentElement.classList.remove("is-gallery-open");
    sendBack(i, 1);
    choose(null);
  }, [sendBack, choose, playClose]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const i = activeRef.current;
      if (i === null) return;
      // Press feedback: the matching arrow button nudges the way it points
      // and springs back (restarted on every press, mouse or keyboard).
      const btn = document.querySelectorAll<HTMLElement>(".gallery-nav button")[dir === 1 ? 1 : 0];
      if (btn) {
        btn.classList.remove("is-pressed");
        void btn.offsetWidth;
        btn.classList.add("is-pressed");
      }
      const next = (i + dir + ITEMS.length) % ITEMS.length;
      playOpen();
      sendBack(i, BEHIND_SCALE);
      bringUp(next, BEHIND_SCALE);
    },
    [sendBack, bringUp, playOpen],
  );

  // Keys while open: Escape closes, left/right step through.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, step]);

  // Keep the big card centred if the window resizes while it's open.
  useEffect(() => {
    if (active === null) return;
    const onResize = () => setFlights((fs) => fs.map((f) => (f.open ? { ...f, box: galleryBox() } : f)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  const away = new Set(flights.map((f) => f.i));

  return (
    <section
      ref={ref}
      className={`playground${open ? " is-open" : ""}`}
      aria-label="Playground"
      style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
    >
      {ITEMS.map((item, i) => (
        <article
          key={i}
          className={`playground-card${away.has(i) ? " is-away" : ""}`}
          style={{
            left: `${(item.x / FRAME_W) * 100}%`,
            top: `${(item.y / FRAME_H) * 100}%`,
            "--rot": `${item.rot}deg`,
            // How far this card is from the middle of the pile, in section
            // widths (cqw), for the squeeze.
            "--from-x": `${((item.x - FRAME_W / 2) / FRAME_W) * 100}cqw`,
            "--from-y": `${((item.y - FRAME_H / 2) / FRAME_W) * 100}cqw`,
          } as React.CSSProperties}
          onPointerEnter={playHover}
          onPointerMove={follow}
          onPointerLeave={unfollow}
          onClick={() => openAt(i)}
        >
          <span className="playground-title">{item.title}</span>
          <span className="playground-date">{item.date}</span>
          {/* Swaps in for the date on hover (Figma 62:17). */}
          <svg className="playground-arrow" width="6" height="6" viewBox="0 0 5.83 5.83" aria-hidden>
            <path d="M5.04 0h.07c.2 0 .37.07.51.21.14.15.21.32.21.51v.06c0 .02 0 .03-.02.05v3.55c0 .2-.07.37-.21.51a.7.7 0 0 1-.51.21.7.7 0 0 1-.51-.21.7.7 0 0 1-.22-.51V2.49L1.25 5.62a1 1 0 0 1-.24.15.7.7 0 0 1-.29.06.7.7 0 0 1-.51-.21.7.7 0 0 1-.21-.51c0-.1.02-.2.06-.29a1 1 0 0 1 .15-.24l3.13-3.1H1.45a.7.7 0 0 1-.51-.22.7.7 0 0 1-.22-.5c0-.21.07-.38.21-.52.15-.14.32-.21.52-.21H5c.01-.02.03-.02.04-.02Z" fill="currentColor" />
          </svg>
          <div className="playground-media">
            <Media item={item} />
          </div>
        </article>
      ))}

      {flights.length > 0 &&
        createPortal(
          // The layer itself is the "outside": clicking it closes.
          <div className={`gallery${active !== null ? " is-open" : ""}`} onClick={close}>
            {active !== null && (
              <>
                <span className="gallery-count">
                  {active + 1}/{ITEMS.length}
                </span>
                <button type="button" className="gallery-close" aria-label="Close" onClick={close}>
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                    <path
                      d="M9.7 8.27c.2.2.3.44.3.72 0 .28-.1.52-.3.71a1 1 0 0 1-.33.23 1 1 0 0 1-.36.07 1 1 0 0 1-.4-.07 1 1 0 0 1-.34-.23L5 6.4 1.73 9.7a1 1 0 0 1-.34.23 1 1 0 0 1-.4.07 1 1 0 0 1-.36-.07 1 1 0 0 1-.33-.23A1 1 0 0 1 0 8.99c0-.28.1-.52.3-.72L3.6 5 .3 1.73A1 1 0 0 1 0 1.01C0 .73.1.49.3.3.49.1.73 0 1.01 0c.28 0 .52.1.72.3L5 3.6 8.27.3c.2-.2.44-.3.72-.3.28 0 .52.1.71.3.2.19.3.43.3.71 0 .28-.1.52-.3.72L6.4 5l3.3 3.27Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <div
                  className="gallery-nav"
                  style={{ top: galleryBox().y + galleryBox().h / 2 + 17 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => step(-1)}
                    onAnimationEnd={(e) => e.currentTarget.classList.remove("is-pressed")}
                  >
                    <svg width="6" height="10" viewBox="17 15 6 10" aria-hidden>
                      <path d="M22.72 23.27c.19.2.28.44.28.72 0 .28-.09.52-.28.72a1 1 0 0 1-.31.22 1 1 0 0 1-.34.07 1 1 0 0 1-.37-.07 1 1 0 0 1-.32-.22l-3.07-3.3L17 20l1.31-1.4 3.07-3.3c.19-.2.41-.3.67-.3.27 0 .49.1.67.3.19.19.28.43.28.72 0 .27-.09.51-.28.71L19.62 20l3.1 3.27Z" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => step(1)}
                    onAnimationEnd={(e) => e.currentTarget.classList.remove("is-pressed")}
                  >
                    <svg width="6" height="10" viewBox="17 15 6 10" style={{ transform: "rotate(180deg)" }} aria-hidden>
                      <path d="M22.72 23.27c.19.2.28.44.28.72 0 .28-.09.52-.28.72a1 1 0 0 1-.31.22 1 1 0 0 1-.34.07 1 1 0 0 1-.37-.07 1 1 0 0 1-.32-.22l-3.07-3.3L17 20l1.31-1.4 3.07-3.3c.19-.2.41-.3.67-.3.27 0 .49.1.67.3.19.19.28.43.28.72 0 .27-.09.51-.28.71L19.62 20l3.1 3.27Z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </>
            )}
            {flights.map((f) => {
              const item = ITEMS[f.i];
              const icon = <GalleryIcon />;
              return (
                <article
                  key={f.key}
                  className={`gallery-card${f.open ? " is-open" : ""}${f.behind ? " is-behind" : ""}`}
                  style={{
                    left: f.box.x,
                    top: f.box.y,
                    width: f.box.w,
                    height: f.box.h,
                    transform: `translate(-50%, -50%) rotate(${f.box.rot}deg)`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="playground-title">{item.title}</span>
                  {item.href ? (
                    <a className="gallery-icon-link" href={item.href} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}>
                      {icon}
                    </a>
                  ) : (
                    <span className="gallery-icon-link">{icon}</span>
                  )}
                  <div className="playground-media">
                    <Media item={item} />
                  </div>
                  <p className="gallery-description">{item.description ?? DEFAULT_DESCRIPTION}</p>
                </article>
              );
            })}
          </div>,
          document.body,
        )}
    </section>
  );
}
