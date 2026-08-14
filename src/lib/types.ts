/**
 * Core domain types.
 *
 * Times are milliseconds as integers (never floats) so SRT/VTT export is exact
 * and there is no float-drift when comparing against `video.currentTime`.
 *
 * A subtitle's effective end time (`SubtitleWithEnd.endMs`) is never stored —
 * it is derived at render time from the line's start, text, the reading-speed
 * settings, and the next line's start, unless the line carries a `manualEndMs`
 * override. See timing.ts.
 */

/** The fixed speaker labels a line can carry. */
export const SPEAKERS = ["A", "B", "C"] as const;
export type Speaker = (typeof SPEAKERS)[number];

export interface Subtitle {
  /** Stable identity, generated with `crypto.randomUUID()`. */
  id: string;
  /** >= 0, integer. Captured from `video.currentTime` at the moment of pause. */
  startMs: number;
  /** Trimmed, no `-->`. May contain `\n` for multi-line blocks. */
  text: string;
  /**
   * Optional user override for the end time, absolute video time in integer
   * milliseconds. Absent → the end is derived from reading speed. When present
   * it replaces the reading estimate but is still clamped to the next line's
   * start and floored to `startMs + 1` at render time (see timing.ts).
   * Persisted in the same localStorage key.
   */
  manualEndMs?: number;
  /**
   * Optional speaker label (`"A"` | `"B"` | `"C"`). Absent → unassigned.
   * Assigned by the per-line speaker button, which cycles through the labels.
   * Persisted in the same localStorage key.
   */
  speaker?: Speaker;
}

export interface SubtitleWithEnd extends Subtitle {
  /**
   * Effective end (inclusive start, exclusive end). Equals `manualEndMs` when
   * set, otherwise the reading-speed estimate; always clamped to the next
   * line's start and floored to `startMs + 1`. Never persisted.
   */
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

/**
 * A named bundle of one video's subtitles. Projects let the user manage
 * several videos, each with its own subtitle list.
 */
export interface Project {
  /** Stable identity, generated with `crypto.randomUUID()`. */
  id: string;
  /** Display name. Defaults to the video's base name; user-renamable. */
  name: string;
  /** Original video file name with extension, e.g. `"clip.mp4"`. Empty when unknown. */
  videoName: string;
  /** Creation epoch ms — drives list ordering (newest first). */
  createdAt: number;
  /** The project's subtitles, in insertion order (display order derived). */
  subtitles: Subtitle[];
}
