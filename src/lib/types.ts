/**
 * Core domain types.
 *
 * Times are milliseconds as integers (never floats) so SRT/VTT export is exact
 * and there is no float-drift when comparing against `video.currentTime`.
 *
 * `endMs` is never stored — it is derived at render time from the line's start,
 * text, the reading-speed settings, and the next line's start. See timing.ts.
 */
export interface Subtitle {
  /** Stable identity, generated with `crypto.randomUUID()`. */
  id: string;
  /** >= 0, integer. Captured from `video.currentTime` at the moment of pause. */
  startMs: number;
  /** Trimmed, no `-->`. May contain `\n` for multi-line blocks. */
  text: string;
}

export interface SubtitleWithEnd extends Subtitle {
  /** Derived end time (inclusive start, exclusive end). Never persisted. */
  endMs: number;
}

export interface Settings {
  /** Reading speed in characters per second. */
  charsPerSec: number;
  /** Minimum on-screen duration in seconds. */
  minDurationSec: number;
  /** Maximum on-screen duration in seconds. */
  maxDurationSec: number;
}

/** An in-progress line captured at a pause point, not yet committed. */
export interface Draft {
  startMs: number;
}
