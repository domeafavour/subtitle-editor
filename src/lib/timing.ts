import type { Settings, Subtitle, SubtitleWithEnd } from "./types";

/**
 * Derived-timing core. End times are computed, never stored — derived from the
 * reading-speed estimate by default, overridable per line via `manualEndMs`.
 * Clamping and overlap prevention reflow live whenever lines are added,
 * edited, deleted, nudged, overridden, or the reading-speed settings change.
 *
 * The algorithm (ADR 0001 + ADR 0002):
 *   baseDuration = clamp(chars / charsPerSec, min, max)
 *   preferred    = manualEndMs ?? (start + baseDuration)
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
 * otherwise the reading-speed estimate. Always clamped to `nextStartMs` when
 * that is earlier (no overlaps), and floored to `start + 1` so SRT stays valid
 * even when two lines share the same start time.
 */
export function effectiveEndMs(
  sub: Subtitle,
  nextStartMs: number | null,
  settings: Settings,
): number {
  const estimate = sub.startMs + baseDurationMs(sub.text, settings);
  const preferred = sub.manualEndMs != null ? sub.manualEndMs : estimate;
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
