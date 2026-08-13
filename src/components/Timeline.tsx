import type { RefObject } from "react";
import { useEffect, useMemo, useState } from "react";

import { formatTimestamp } from "#/lib/format";
import { blockGeometry, playheadPercent } from "#/lib/timeline";
import type { SubtitleWithEnd } from "#/lib/types";

interface TimelineProps {
  lines: SubtitleWithEnd[];
  /** Scale in integer ms — the video duration, or the last line's end. */
  durationMs: number;
  isPlaying: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onPlayRange: (startMs: number, endMs: number) => void;
}

/**
 * Horizontal track showing each line's `[start, end)` as a block, scaled
 * against `durationMs`. Clicking a block plays that line's range; a red
 * playhead tracks the video's current time while it plays.
 */
export function Timeline({
  lines,
  durationMs,
  isPlaying,
  videoRef,
  onPlayRange,
}: TimelineProps) {
  const [playheadMs, setPlayheadMs] = useState(0);

  const geometries = useMemo(
    () =>
      lines.map((line) => blockGeometry(line.startMs, line.endMs, durationMs)),
    [lines, durationMs],
  );

  // Snap the playhead on pause / scale change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: isPlaying and durationMs are intentional triggers, not read in the body.
  useEffect(() => {
    const video = videoRef.current;
    setPlayheadMs(video ? Math.round(video.currentTime * 1000) : 0);
  }, [isPlaying, durationMs, videoRef]);

  // Move the playhead while playing (60 Hz, re-renders only this small track).
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) setPlayheadMs(video.currentTime * 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, videoRef]);

  return (
    <div className="relative h-10 w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      {durationMs > 0 &&
        lines.map((line, index) => {
          const geometry = geometries[index];
          const label = `${formatTimestamp(line.startMs)} → ${formatTimestamp(line.endMs)} · ${line.text}`;
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => onPlayRange(line.startMs, line.endMs)}
              title={label}
              aria-label={label}
              style={{
                left: `${geometry.leftPercent}%`,
                width: `${geometry.widthPercent}%`,
              }}
              className={`absolute top-1 bottom-1 rounded-sm transition-colors ${
                line.manualEndMs != null
                  ? "bg-blue-500/70 hover:bg-blue-400/80"
                  : "bg-neutral-600 hover:bg-neutral-500"
              }`}
            />
          );
        })}
      {durationMs > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-500"
          style={{ left: `${playheadPercent(playheadMs, durationMs)}%` }}
        />
      )}
    </div>
  );
}
