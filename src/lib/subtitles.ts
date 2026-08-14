import { isMeaningful, sanitizeText } from "./text";
import type { Subtitle } from "./types";

/**
 * Pure subtitle mutators, extracted from the old useSubtitles hook so the
 * behavior is unit-testable and shared. On a no-op (e.g. committing empty
 * text) they return the same array reference so callers can skip re-renders.
 */

/**
 * Append a line. Rejects empty/whitespace text; rounds `startMs`. Pass `id`
 * to control the new line's identity (e.g. so the caller can measure and
 * store its speech duration afterwards); defaults to a random UUID.
 */
export function addSubtitle(
  subtitles: Subtitle[],
  startMs: number,
  text: string,
  id?: string,
): Subtitle[] {
  const clean = sanitizeText(text);
  if (!isMeaningful(clean)) return subtitles;
  return [
    ...subtitles,
    {
      id: id ?? crypto.randomUUID(),
      startMs: Math.max(0, Math.round(startMs)),
      text: clean,
    },
  ];
}

/** Replace a line's text. No-op for empty/whitespace text. */
export function updateSubtitleText(
  subtitles: Subtitle[],
  id: string,
  text: string,
): Subtitle[] {
  const clean = sanitizeText(text);
  if (!isMeaningful(clean)) return subtitles;
  return subtitles.map((sub) =>
    sub.id === id ? { ...sub, text: clean } : sub,
  );
}

/** Set (ms) or clear (null) a manual end override. Rejects `<= startMs`. */
export function setSubtitleManualEnd(
  subtitles: Subtitle[],
  id: string,
  endMs: number | null,
): Subtitle[] {
  return subtitles.map((sub) => {
    if (sub.id !== id) return sub;
    if (endMs == null) {
      const { manualEndMs, ...rest } = sub;
      return rest;
    }
    if (!Number.isFinite(endMs) || Math.round(endMs) <= sub.startMs) {
      return sub;
    }
    return { ...sub, manualEndMs: Math.round(endMs) };
  });
}

/**
 * Store a measured speech duration for a line (ms). Rejects non-positive or
 * non-finite values and unknown ids (no-op → same array reference).
 */
export function setSpeechDurationMs(
  subtitles: Subtitle[],
  id: string,
  ms: number,
): Subtitle[] {
  if (!Number.isFinite(ms) || ms <= 0) return subtitles;
  const rounded = Math.round(ms);
  let changed = false;
  const next = subtitles.map((sub) => {
    if (sub.id !== id || sub.speechDurationMs === rounded) return sub;
    changed = true;
    return { ...sub, speechDurationMs: rounded };
  });
  return changed ? next : subtitles;
}

/**
 * Move a line's start by `deltaMs`, clamped at 0. Clears the manual end
 * override when the start would cross it (keeps `manualEndMs > startMs`).
 */
export function nudgeSubtitleStart(
  subtitles: Subtitle[],
  id: string,
  deltaMs: number,
): Subtitle[] {
  return subtitles.map((sub) => {
    if (sub.id !== id) return sub;
    const startMs = Math.max(0, sub.startMs + deltaMs);
    if (sub.manualEndMs != null && startMs >= sub.manualEndMs) {
      const { manualEndMs, ...rest } = sub;
      return { ...rest, startMs };
    }
    return { ...sub, startMs };
  });
}

/** Remove a line by id. */
export function removeSubtitle(subtitles: Subtitle[], id: string): Subtitle[] {
  return subtitles.filter((sub) => sub.id !== id);
}
