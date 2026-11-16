// Looping "turning" sound for the 3D iPod, louder the faster it spins.
// Uses Web Audio so the loop repeats seamlessly (an <audio> loop leaves a
// gap each time). Silent and stopped whenever the iPod isn't turning, or
// when the site is muted (sound.ts).
import { isMuted } from "../sound";
const MAX_VOLUME = 0.7;
const FULL_SPEED = 3; // degrees per frame for full volume

export function createTurnSound(url: string) {
  let ctx: AudioContext | null = null;
  let gain: GainNode | null = null;
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  let loading = false;
  let volume = 0;

  const stopSource = () => {
    source?.stop();
    source?.disconnect();
    source = null;
  };

  return {
    /** Call from a user gesture (pointer down / key press): browsers only
     *  allow audio to start after one. Loads the sound the first time. */
    prime() {
      if (!ctx) {
        ctx = new AudioContext();
        gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(ctx.destination);
      }
      void ctx.resume();
      if (!buffer && !loading) {
        loading = true;
        const c = ctx;
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((b) => c.decodeAudioData(b))
          .then((b) => (buffer = b))
          .catch(() => (loading = false));
      }
    },

    /** Every frame, with how far the iPod turned (degrees) since the last. */
    update(speed: number) {
      const target = isMuted() ? 0 : Math.min(1, speed / FULL_SPEED) * MAX_VOLUME;
      // Rises fast when you start turning, eases off as it slows down.
      volume += (target - volume) * (target > volume ? 0.35 : 0.12);
      if (!ctx || !gain || !buffer) return;
      if (volume > 0.005 && !source) {
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        source.start();
      }
      if (source) {
        gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
        // A little faster when spun hard.
        source.playbackRate.setTargetAtTime(0.9 + 0.25 * Math.min(1, speed / FULL_SPEED), ctx.currentTime, 0.05);
      }
      if (volume <= 0.005 && source) stopSource();
    },

    /** Silence it right away (popup closed). */
    stop() {
      volume = 0;
      if (gain && ctx) gain.gain.setValueAtTime(0, ctx.currentTime);
      stopSource();
    },
  };
}
