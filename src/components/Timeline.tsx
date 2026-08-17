import { useSelector } from "@xstate/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePlayback } from "#/hooks/editorContext";
import { useLines } from "#/hooks/useProjectData";
import { formatTimestamp } from "#/lib/format";
import {
  blockGeometry,
  MIN_BLOCK_WIDTH_PX,
  playheadPx,
  timelineScale,
} from "#/lib/timeline";
import { speechMeasureStore } from "#/store/speechMeasureStore";

/**
 * Horizontal track showing each line's `[start, end)` as a block, scaled
 * against the video duration (or the last line's end). Clicking a block plays
 * that line's range; a red playhead tracks the video's current time while it
 * plays. Reads the playback machine and the subtitle list from context —
 * no props.
 *
 * The track is pixel-scaled: short videos fill the container exactly, while
 * long videos grow the content wider than the screen (horizontal scroll) at a
 * minimum scale so every line keeps a visible `MIN_BLOCK_WIDTH_PX` width
 * instead of shrinking to a sub-pixel sliver. The playhead auto-scrolls into
 * view while playing and on seeks.
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

  // The scroll container's width, kept current so short videos keep fitting
  // the track while long videos fall back to the minimum scale.
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Zoom: fills the container for short videos, floors at the minimum scale
  // for long videos so every line stays at least `MIN_BLOCK_WIDTH_PX` wide.
  const pxPerMs = useMemo(
    () => timelineScale(durationMs, trackWidth),
    [durationMs, trackWidth],
  );

  const geometries = useMemo(
    () =>
      lines.map((line) =>
        blockGeometry(line.startMs, line.endMs, durationMs, pxPerMs),
      ),
    [lines, durationMs, pxPerMs],
  );

  // Keep the playhead visible when the content is wider than the track.
  const scrollPlayheadIntoView = useCallback(
    (ms: number) => {
      const el = trackRef.current;
      if (!el || pxPerMs <= 0) return;
      const x = ms * pxPerMs;
      const margin = 24;
      if (x < el.scrollLeft + margin) {
        el.scrollLeft = Math.max(0, x - margin);
      } else if (x > el.scrollLeft + el.clientWidth - margin) {
        el.scrollLeft = x - el.clientWidth + margin;
      }
    },
    [pxPerMs],
  );

  return (
    <div
      ref={trackRef}
      className="relative h-10 min-w-0 max-w-full w-full overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900"
    >
      {durationMs > 0 && pxPerMs > 0 && (
        <div
          className="relative h-full min-w-full"
          style={{ width: durationMs * pxPerMs }}
        >
          {lines.map((line, index) => {
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
                  left: `${geometry.leftPx}px`,
                  width: `${geometry.widthPx}px`,
                  minWidth: MIN_BLOCK_WIDTH_PX,
                }}
                className={`absolute top-1 bottom-1 rounded-sm transition-colors hover:z-10 ${
                  isMeasuring
                    ? "animate-pulse bg-neutral-500"
                    : line.manualEndMs != null
                      ? "bg-blue-500/70 hover:bg-blue-400/80"
                      : "bg-neutral-600 hover:bg-neutral-500"
                }`}
              />
            );
          })}
          <Playhead
            durationMs={durationMs}
            pxPerMs={pxPerMs}
            scrollIntoView={scrollPlayheadIntoView}
          />
        </div>
      )}
    </div>
  );
}

interface PlayheadProps {
  durationMs: number;
  pxPerMs: number;
  scrollIntoView: (ms: number) => void;
}

/**
 * The red playhead. Owns its position and the live-tracking loop so the 60 Hz
 * `setState` re-renders only this one `<div>` — the block list above stays out
 * of the per-frame render path. Reflects settled positions (pauses, seeks)
 * and re-snaps/scrolls on scale changes from the parent.
 */
function Playhead({ durationMs, pxPerMs, scrollIntoView }: PlayheadProps) {
  const playback = usePlayback();
  const [ms, setMs] = useState(playback.currentTime);

  // Reflect the settled position — pauses, keyboard/row seeks, native
  // progress-bar drags (all reach the machine's `currentTime`) — and
  // re-snap/scroll on scale changes (`scrollIntoView` depends on `pxPerMs`,
  // and a fresh video resets `currentTime` to 0).
  useEffect(() => {
    setMs(playback.currentTime);
    scrollIntoView(playback.currentTime);
  }, [playback.currentTime, scrollIntoView]);

  // Move the playhead while playing (60 Hz, re-renders only this playhead;
  // the machine's `currentTime` is frozen while playing, so this is the live
  // source).
  useEffect(() => {
    if (!playback.isPlaying) return;
    let frame = 0;
    const tick = () => {
      const video = playback.videoRef.current;
      if (video) {
        const current = video.currentTime * 1000;
        setMs(current);
        scrollIntoView(current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playback.isPlaying, playback.videoRef, scrollIntoView]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-500"
      style={{ left: `${playheadPx(ms, durationMs, pxPerMs)}px` }}
    />
  );
}
