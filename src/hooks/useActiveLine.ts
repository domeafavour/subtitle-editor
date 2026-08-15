import type { RefObject } from "react";
import { useEffect, useState } from "react";

import { lineContaining } from "#/lib/timing";
import type { SubtitleWithEnd } from "#/lib/types";

/**
 * The line whose range contains the video's current time, updated while
 * playing or after any paused seek (native progress bar, keyboard ←/→/[`/`]).
 *
 * Hybrid tracking: while playing, a rAF loop follows the DOM `currentTime`
 * every frame (scoped to this hook — React bails out unless the active line's
 * object identity changes, so unchanged frames never re-render the list);
 * while paused, it derives from the machine's settled `currentTime`, which the
 * playback hook updates on pause, seek, range end, natural end and draft open.
 * Requires `lines` to be referentially stable across renders (the editor
 * memoizes it) so `find` returns stable object references.
 */
export function useActiveLine(
  lines: SubtitleWithEnd[],
  videoRef: RefObject<HTMLVideoElement | null>,
  isPlaying: boolean,
  currentTimeMs: number,
): SubtitleWithEnd | null {
  const [active, setActive] = useState<SubtitleWithEnd | null>(null);

  useEffect(() => {
    if (lines.length === 0) {
      setActive((prev) => (prev === null ? prev : null));
      return;
    }

    if (isPlaying) {
      // The rAF loop reads videoRef.current each frame, so it also picks up a
      // video that mounts later.
      let frame = 0;
      let cancelled = false;
      const tick = () => {
        if (cancelled) return;
        const video = videoRef.current;
        if (video) {
          const found = lineContaining(
            lines,
            Math.round(video.currentTime * 1000),
          );
          setActive((prev) => (prev === found ? prev : found));
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
      };
    }

    // Paused: the settled position is authoritative — a fresh video load
    // resets it to 0, and every seek/pause updates it.
    const found = lineContaining(lines, Math.round(currentTimeMs));
    setActive((prev) => (prev === found ? prev : found));
  }, [isPlaying, lines, videoRef, currentTimeMs]);

  return active;
}
