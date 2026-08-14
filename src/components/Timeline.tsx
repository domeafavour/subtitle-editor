import { useSelector } from "@xstate/react";
import { useEffect, useMemo, useState } from "react";

import { usePlayback } from "#/hooks/editorContext";
import { useLines } from "#/hooks/useProjectData";
import { formatTimestamp } from "#/lib/format";
import { blockGeometry, playheadPercent } from "#/lib/timeline";
import { speechMeasureStore } from "#/store/speechMeasureStore";

/**
 * Horizontal track showing each line's `[start, end)` as a block, scaled
 * against the video duration (or the last line's end). Clicking a block plays
 * that line's range; a red playhead tracks the video's current time while it
 * plays. Reads the playback machine and the subtitle list from context —
 * no props.
 */
export function Timeline() {
  const playback = usePlayback();
  const lines = useLines();
  // Line ids with an in-flight speech-duration measurement.
  const measuring = useSelector(
    speechMeasureStore,
    (snapshot) => snapshot.context.measuring,
  );
  // Scale: the real video duration when loaded, else the last line's end.
  const durationMs =
    playback.videoDuration ?? lines[lines.length - 1]?.endMs ?? 0;
  const [playheadMs, setPlayheadMs] = useState(0);

  const geometries = useMemo(
    () =>
      lines.map((line) => blockGeometry(line.startMs, line.endMs, durationMs)),
    [lines, durationMs],
  );

  // Snap the playhead on pause / scale change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: isPlaying and durationMs are intentional triggers, not read in the body.
  useEffect(() => {
    const video = playback.videoRef.current;
    setPlayheadMs(video ? Math.round(video.currentTime * 1000) : 0);
  }, [playback.isPlaying, durationMs, playback.videoRef]);

  // Move the playhead while playing (60 Hz, re-renders only this small track).
  useEffect(() => {
    if (!playback.isPlaying) return;
    let frame = 0;
    const tick = () => {
      const video = playback.videoRef.current;
      if (video) setPlayheadMs(video.currentTime * 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playback.isPlaying, playback.videoRef]);

  // Reflect paused seeks (e.g. the `[`/`]` jumps or dragging the native
  // progress bar) on the playhead — `timeupdate` fires on seek while paused.
  useEffect(() => {
    const video = playback.videoRef.current;
    if (!video || durationMs <= 0) return;
    const onTimeUpdate = () => {
      if (!playback.isPlaying) {
        setPlayheadMs(Math.round(video.currentTime * 1000));
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [playback.isPlaying, durationMs, playback.videoRef]);

  return (
    <div className="relative h-10 w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
      {durationMs > 0 &&
        lines.map((line, index) => {
          const geometry = geometries[index];
          const isMeasuring = measuring.includes(line.id);
          const label = `${formatTimestamp(line.startMs)} → ${formatTimestamp(line.endMs)} · ${line.text}`;
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => playback.playRange(line.startMs, line.endMs)}
              title={
                isMeasuring ? `Measuring speech duration… · ${label}` : label
              }
              aria-label={
                isMeasuring ? `Measuring speech duration… · ${label}` : label
              }
              style={{
                left: `${geometry.leftPercent}%`,
                width: `${geometry.widthPercent}%`,
              }}
              className={`absolute top-1 bottom-1 rounded-sm transition-colors ${
                isMeasuring
                  ? "animate-pulse bg-neutral-500"
                  : line.manualEndMs != null
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
