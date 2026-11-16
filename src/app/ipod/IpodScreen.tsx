/* eslint-disable @next/next/no-img-element */
import { TRACKS } from "./tracks";

// The iPod's screen (inside the 216 x 150 screen frame, Figma 53:784).
//   "coverflow": every album side by side, the selected one facing you and
//                the rest turned away on either side, like Cover Flow.
//   "playing":   Now Playing, laid out like the iPod classic: cover on the
//                left, song details on the right, progress along the bottom.
// Both screens sit side by side and slide between each other when you switch.
export type ScreenView = "coverflow" | "playing";

const time = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function Cover({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`ipod-cover ${className ?? ""}`} style={style}>
      <img src={src} alt="" draggable={false} />
      {/* Reflection on the "floor" below the cover. */}
      <img className="ipod-cover-reflection" src={src} alt="" draggable={false} />
    </div>
  );
}

export default function IpodScreen({
  view,
  selected,
  current,
  playing,
  time: elapsed,
  duration,
}: {
  view: ScreenView;
  selected: number;
  current: number | null;
  playing: boolean;
  time: number;
  duration: number;
}) {
  const flowTrack = TRACKS[selected];
  const nowTrack = TRACKS[current ?? selected];
  return (
    <div className="ipod-ui">
      <div className="ipod-ui-bar">
        {/* Both titles stacked; the bar crossfades between them. */}
        <span className="ipod-ui-titles">
          <span className={view === "coverflow" ? "is-shown" : undefined}>Cover Flow</span>
          <span className={view === "playing" ? "is-shown" : undefined}>Now Playing</span>
        </span>
        <span className="ipod-ui-status">
          {current !== null && <span className={playing ? "ipod-ui-state is-playing" : "ipod-ui-state"} aria-hidden />}
          <span className="ipod-ui-battery" aria-hidden />
        </span>
      </div>

      {/* Both screens side by side; switching slides between them like the
          original (Now Playing comes in from the right). */}
      <div className={`ipod-ui-pages${view === "playing" ? " is-playing" : ""}`}>
        <div className="ipod-ui-page" aria-hidden={view !== "coverflow"}>
          <div className="ipod-ui-flow">
            {TRACKS.map((t, i) => {
              const d = i - selected;
              const side = Math.sign(d);
              const n = Math.abs(d);
              // Selected cover in the middle facing you; others stacked to the
              // sides, turned away, each a little further out.
              const transform =
                d === 0
                  ? "translateX(0) translateZ(0) rotateY(0deg)"
                  : `translateX(${side * (50 + (n - 1) * 14)}px) translateZ(-28px) rotateY(${-side * 62}deg)`;
              return (
                <Cover
                  key={t.src}
                  src={t.cover}
                  className={d === 0 ? "is-selected" : undefined}
                  style={{ transform, zIndex: 100 - n, opacity: n > 5 ? 0 : 1 }}
                />
              );
            })}
          </div>
          <div className="ipod-ui-fade" />
          <div className="ipod-ui-title">{flowTrack.title}</div>
          <div className="ipod-ui-artist">{flowTrack.artist}</div>
        </div>

        <div className="ipod-ui-page" aria-hidden={view !== "playing"}>
          <Cover src={nowTrack.cover} className="ipod-now-cover" />
          <div className="ipod-now-text">
            <div className="ipod-now-title">{nowTrack.title}</div>
            <div className="ipod-now-meta">{nowTrack.artist}</div>
            <div className="ipod-now-meta">{nowTrack.album}</div>
          </div>
          <div className="ipod-ui-progress">
            <span>{time(current === null ? 0 : elapsed)}</span>
            <span className="ipod-ui-track">
              <span style={{ width: `${duration ? (elapsed / duration) * 100 : 0}%` }} />
            </span>
            <span>-{time(current === null ? 0 : duration - elapsed)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
