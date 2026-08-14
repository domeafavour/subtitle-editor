import type { RefObject } from "react";
import { useEffect, useState } from "react";

import { lineContaining } from "#/lib/timing";
import type { SubtitleWithEnd } from "#/lib/types";

/**
 * The line whose range contains the video's current time, updated while
 * playing or after any paused seek (native progress bar, keyboard ←/→/[`/`]).
 *
 * Hybrid tracking: while playing, a rAF loop follows `currentTime` every
 * frame; while paused, it listens for `seeked`/`timeupdate` instead, so the
 * hook is idle when the playhead is frozen. A late-mounting video (loaded
 * after this effect) is picked up by a slow poll until the element appears.
 * React bails out unless the active line's object identity changes, so
 * unchanged frames never re-render the list. Requires `lines` to be
 * referentially stable across renders (the editor memoizes it) so `find`
 * returns stable object references.
 */
export function useActiveLine(
  lines: SubtitleWithEnd[],
  videoRef: RefObject<HTMLVideoElement | null>,
  isPlaying: boolean,
): SubtitleWithEnd | null {
  const [active, setActive] = useState<SubtitleWithEnd | null>(null);

  useEffect(() => {
    if (lines.length === 0) {
      setActive((prev) => (prev === null ? prev : null));
      return;
    }
    let frame = 0;
    let waitTimer: ReturnType<typeof setTimeout> | undefined;
    let attachedVideo: HTMLVideoElement | null = null;
    let cancelled = false;

    const update = () => {
      const video = videoRef.current;
      if (!video) return;
      const found = lineContaining(lines, Math.round(video.currentTime * 1000));
      setActive((prev) => (prev === found ? prev : found));
    };

    const cleanup = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (waitTimer) clearTimeout(waitTimer);
      attachedVideo?.removeEventListener("seeked", update);
      attachedVideo?.removeEventListener("timeupdate", update);
    };

    if (isPlaying) {
      // The rAF loop reads videoRef.current each frame, so it also picks up a
      // video that mounts later.
      const tick = () => {
        if (cancelled) return;
        update();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return cleanup;
    }

    // Paused: react to manual/keyboard seeks instead of polling. The video
    // may mount after this effect (a video loaded later), so wait for it
    // with a slow poll, then stop.
    const attach = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video) {
        waitTimer = setTimeout(attach, 200);
        return;
      }
      attachedVideo = video;
      video.addEventListener("seeked", update);
      video.addEventListener("timeupdate", update);
      update(); // reflect the current paused position immediately
    };
    waitTimer = setTimeout(attach, 0);
    return cleanup;
  }, [isPlaying, lines, videoRef]);

  return active;
}
