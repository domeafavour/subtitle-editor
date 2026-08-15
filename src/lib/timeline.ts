export interface BlockGeometry {
  /** The block's left edge in pixels from the start of the track content. */
  leftPx: number;
  /** The block's true width in pixels (never inflated here). */
  widthPx: number;
}

/** Minimum visible block width, applied as CSS `min-width` on every block. */
export const MIN_BLOCK_WIDTH_PX = 5;

/**
 * The line duration that the minimum scale guarantees stays at least
 * `MIN_BLOCK_WIDTH_PX` wide — a 1-second line is the reference.
 */
export const MIN_SCALE_REFERENCE_MS = 1000;

/**
 * Zoom floor for long videos: a line of `MIN_SCALE_REFERENCE_MS` renders at
 * `MIN_BLOCK_WIDTH_PX`, so any video longer than the track gets a horizontal
 * scrollbar instead of sub-pixel bars. Lines shorter than the reference are
 * still at least `MIN_BLOCK_WIDTH_PX` via CSS `min-width`.
 */
export const MIN_SCALE_PX_PER_MS = MIN_BLOCK_WIDTH_PX / MIN_SCALE_REFERENCE_MS;

/**
 * Pixels per millisecond for a track of `trackWidthPx` showing `durationMs`:
 * the fit scale (fills the container for short videos) floored at the minimum
 * scale (keeps every line visible for long videos). 0 for non-positive inputs.
 */
export function timelineScale(
  durationMs: number,
  trackWidthPx: number,
): number {
  if (durationMs <= 0 || trackWidthPx <= 0) return 0;
  return Math.max(trackWidthPx / durationMs, MIN_SCALE_PX_PER_MS);
}

/**
 * Position a line's `[startMs, endMs)` range on a track of `durationMs` at
 * `pxPerMs`. Inputs are clamped to the track, so a block's right edge never
 * exceeds `durationMs * pxPerMs` — the content width. The true (uninflated)
 * width is returned; visibility for sub-pixel lines is a rendering concern
 * (CSS `min-width`), not a layout inflation, so blocks never overlap unless
 * the lines themselves do (which the data model forbids).
 */
export function blockGeometry(
  startMs: number,
  endMs: number,
  durationMs: number,
  pxPerMs: number,
): BlockGeometry {
  if (durationMs <= 0 || pxPerMs <= 0) return { leftPx: 0, widthPx: 0 };
  const start = clamp(startMs, 0, durationMs);
  const end = clamp(endMs, start, durationMs);
  return { leftPx: start * pxPerMs, widthPx: (end - start) * pxPerMs };
}

/** Position of a playhead at `ms` on a track of `durationMs` at `pxPerMs`. */
export function playheadPx(
  ms: number,
  durationMs: number,
  pxPerMs: number,
): number {
  if (durationMs <= 0 || pxPerMs <= 0) return 0;
  return clamp(ms, 0, durationMs) * pxPerMs;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
