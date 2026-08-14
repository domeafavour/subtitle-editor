import type { Settings, Subtitle, SubtitleWithEnd } from "./types";

/**
 * Derived-timing core. End times are computed, never stored — derived from the
 * reading-speed estimate by default, overridable per line via `manualEndMs`.
 * Clamping and overlap prevention reflow live whenever lines are added,
 * edited, deleted, nudged, overridden, or the reading-speed settings change.
 *
 * The algorithm (ADR 0001 + ADR 0002):
 *   baseDuration = clamp(chars / charsPerSec, min, max)     // reading estimate
 *   speech       = speechDurationMs ?? baseDuration          // speech mode
 *   preferred    = manualEndMs ?? (mode === "speech" ? start + speech : start + baseDuration)
 *   end          = min(preferred, nextLine.start)     // never overlaps
 */

/** Reading-time estimate for `text` in milliseconds. */
export function baseDurationMs(text: string, settings: Settings): number {
  const lo = Math.min(settings.minDurationSec, settings.maxDurationSec);
  const hi = Math.max(settings.minDurationSec, settings.maxDurationSec);
  const rate = settings.charsPerSec;
  // A non-positive rate is a defensive fallback: give the line the full max.
  const secs = rate > 0 ? Math.min(Math.max(text.length / rate, lo), hi) : hi;
  return Math.round(secs * 1000);
}

/**
 * Effective end time for a subtitle: the `manualEndMs` override when set,
 * otherwise the default-end derivation — the measured `speechDurationMs`
 * when the mode is `"speech"`, else the reading-speed estimate. Always
 * clamped to `nextStartMs` when that is earlier (no overlaps), and floored to
 * `start + 1` so SRT stays valid even when two lines share the same start.
 */
export function effectiveEndMs(
  sub: Subtitle,
  nextStartMs: number | null,
  settings: Settings,
): number {
  const estimate = sub.startMs + baseDurationMs(sub.text, settings);
  const speech =
    sub.speechDurationMs != null
      ? sub.startMs + sub.speechDurationMs
      : estimate; // unmeasured line in speech mode → reading fallback
  const preferred =
    sub.manualEndMs != null
      ? sub.manualEndMs
      : settings.endMode === "speech"
        ? speech
        : estimate;
  const byNext =
    nextStartMs == null ? preferred : Math.min(preferred, nextStartMs);
  return Math.max(byNext, sub.startMs + 1);
}

/**
 * Subtitles sorted chronologically by start time (stable tiebreak by id), each
 * with its derived end time attached. Order is derived here — never stored.
 */
export function sortedWithEnds(
  subtitles: Subtitle[],
  settings: Settings,
): SubtitleWithEnd[] {
  const sorted = [...subtitles].sort(
    (a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id),
  );
  return sorted.map((sub, i) => ({
    ...sub,
    endMs: effectiveEndMs(sub, sorted[i + 1]?.startMs ?? null, settings),
  }));
}

/**
 * The line whose `[startMs, endMs)` range strictly contains `tMs`. Returns
 * null in a gap, before the first line, past the last line, or for an empty
 * list. `lines` must be sorted and non-overlapping (as `sortedWithEnds`).
 */
export function lineContaining(
  lines: SubtitleWithEnd[],
  tMs: number,
): SubtitleWithEnd | null {
  return lines.find((line) => line.startMs <= tMs && line.endMs > tMs) ?? null;
}

/**
 * The line at video position `tMs`, using `[startMs, endMs)` ranges (end is
 * exclusive). Returns the line whose range contains `tMs`; when `tMs` sits in
 * a gap (or before the first line) returns the next line; past the last line
 * returns the last line; an empty list returns null.
 * `lines` must be sorted by start and non-overlapping (as `sortedWithEnds`
 * produces) — this helper does not sort internally.
 */
export function lineAtPosition(
  lines: SubtitleWithEnd[],
  tMs: number,
): SubtitleWithEnd | null {
  const containing = lineContaining(lines, tMs);
  if (containing) return containing;
  for (const line of lines) {
    if (line.endMs > tMs) return line; // in a gap: the line that starts next
  }
  return lines.length > 0 ? lines[lines.length - 1] : null;
}

/**
 * The line start strictly before video position `tMs` — a vim-`b`-like motion:
 * from inside a line it returns that line's start; from a line's start (or a
 * gap) it returns the previous line's start. Returns null when there is no
 * line before `tMs`. `lines` must be sorted by start (as `sortedWithEnds`).
 */
export function previousLineStartMs(
  lines: SubtitleWithEnd[],
  tMs: number,
): number | null {
  let result: number | null = null;
  for (const line of lines) {
    if (line.startMs < tMs) {
      result = line.startMs;
    } else {
      break; // sorted by start — no later line can be `< tMs`
    }
  }
  return result;
}
