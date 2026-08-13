import type { RefObject } from "react";
import { useEffect, useState } from "react";

import type { SubtitleWithEnd } from "#/lib/types";

interface PlaybackOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  lines: SubtitleWithEnd[];
  isPlaying: boolean;
}

/**
 * Renders the active subtitle over the video while it plays.
 *
 * A rAF loop reads `currentTime` and updates state only when the active line's
 * id changes, so the 60 Hz loop never re-renders the rest of the tree.
 */
export function PlaybackOverlay({
  videoRef,
  lines,
  isPlaying,
}: PlaybackOverlayProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        const tMs = Math.round(video.currentTime * 1000);
        const active = lines.find(
          (line) => line.startMs <= tMs && line.endMs > tMs,
        );
        setActiveId(active?.id ?? null);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, lines, videoRef]);

  const active = lines.find((line) => line.id === activeId) ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4">
      {active && (
        <div className="max-w-[90%] rounded bg-black/70 px-3 py-1.5 text-center text-xl font-medium text-white whitespace-pre-line">
          {active.text}
        </div>
      )}
    </div>
  );
}
