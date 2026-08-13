import type { RefObject } from "react";
import { useEffect, useState } from "react";

import { lineContaining } from "#/lib/timing";
import type { SubtitleWithEnd } from "#/lib/types";

/**
 * The line whose range contains the video's current time, updated every frame
 * while the component is mounted (covers playback, paused seeks, and a video
 * that mounts after this effect). React bails out unless the active line's
 * object identity changes — so the list only re-renders on boundary crossings.
 * Requires `lines` to be referentially stable across renders (the editor
 * memoizes it) so `find` returns stable object references.
 */
export function useActiveLine(
  lines: SubtitleWithEnd[],
  videoRef: RefObject<HTMLVideoElement | null>,
): SubtitleWithEnd | null {
  const [active, setActive] = useState<SubtitleWithEnd | null>(null);

  useEffect(() => {
    if (lines.length === 0) {
      setActive(null);
      return;
    }
    let frame = 0;
    const tick = () => {
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
    return () => cancelAnimationFrame(frame);
  }, [lines, videoRef]);

  return active;
}
