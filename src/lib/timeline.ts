export interface BlockGeometry {
  /** 0..100 — the block's left edge as a percentage of the track. */
  leftPercent: number;
  /** 0..100 — guarantees `leftPercent + widthPercent <= 100` (no overflow). */
  widthPercent: number;
}

/** Minimum visible block width, ~3px on a 600px track. */
export const MIN_BLOCK_WIDTH_PERCENT = 0.5;

/**
 * Position a line's `[startMs, endMs)` range on a track of `durationMs`.
 * Inputs are clamped to the track; the min-width is capped at `100 - left` so
 * a block never overflows the right edge.
 */
export function blockGeometry(
  startMs: number,
  endMs: number,
  durationMs: number,
  minWidthPercent: number = MIN_BLOCK_WIDTH_PERCENT,
): BlockGeometry {
  if (durationMs <= 0) return { leftPercent: 0, widthPercent: 0 };
  const start = clamp(startMs, 0, durationMs);
  const end = clamp(endMs, start, durationMs);
  const leftPercent = (start / durationMs) * 100;
  const rawWidthPercent = ((end - start) / durationMs) * 100;
  const widthPercent = Math.max(
    rawWidthPercent,
    Math.min(minWidthPercent, 100 - leftPercent),
  );
  return { leftPercent, widthPercent };
}

/** Position of a playhead at `ms` on a track of `durationMs` (0..100). */
export function playheadPercent(ms: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return (clamp(ms, 0, durationMs) / durationMs) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
