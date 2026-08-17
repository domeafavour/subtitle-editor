/**
 * Core domain types.
 *
 * Times are milliseconds as integers (never floats) so SRT/VTT export is exact
 * and there is no float-drift when comparing against `video.currentTime`.
 *
 * A subtitle's effective end time (`SubtitleWithEnd.endMs`) is never stored —
 * it is derived at render time from the line's start, text, the default-end
 * mode (reading-speed settings, or the measured speech duration), and the
 * next line's start, unless the line carries a `manualEndMs` override. See
 * timing.ts.
 */

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
   * Optional measured speaking time for this line's text, in integer
   * milliseconds — how long the browser TTS takes to say it, measured
   * silently when the line is added/edited (see speechDuration.ts). Only
   * consulted when the default end mode is `"speech"`; absent → the reading
   * estimate is the fallback. Persisted so reloads and exports reuse it.
   */
  speechDurationMs?: number;
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
  /**
   * How a new line's default end is derived: the reading-speed estimate
   * (`"reading"`) or the line's measured speech duration (`"speech"`).
   */
  endMode: "reading" | "speech";
  /**
   * Whether pausing the video opens the draft composer. Off → pausing just
   * pauses; lines are added manually (+ Add line / `n`).
   */
  openDraftOnPause: boolean;
  /**
   * Speech rate multiplier (1 = normal). Drives the speech-duration
   * measurement and the read-aloud: faster → shorter spoken durations.
   */
  speechSpeed: number;
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
  /**
   * Optional per-project shift in integer ms applied to every line's displayed
   * and exported times (see timing.ts). Stored captures are never rewritten —
   * the offset is a reversible view transform; absent = 0.
   */
  timingOffsetMs?: number;
}
