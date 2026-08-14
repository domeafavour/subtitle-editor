import { nextSpeaker } from "./speaker";
import { isMeaningful, sanitizeText } from "./text";
import type { Subtitle } from "./types";

/**
 * Pure subtitle mutators, extracted from the old useSubtitles hook so the
 * behavior is unit-testable and shared. On a no-op (e.g. committing empty
 * text) they return the same array reference so callers can skip re-renders.
 */

/** Append a line. Rejects empty/whitespace text; rounds `startMs`. */
export function addSubtitle(
  subtitles: Subtitle[],
  startMs: number,
  text: string,
): Subtitle[] {
  const clean = sanitizeText(text);
  if (!isMeaningful(clean)) return subtitles;
  return [
    ...subtitles,
    {
      id: crypto.randomUUID(),
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

/**
 * Advance a line's speaker label one step (`none → A → B → C → none`). The
 * label after C clears the speaker. No-op (same array reference) when the id
 * is absent.
 */
export function cycleSubtitleSpeaker(
  subtitles: Subtitle[],
  id: string,
): Subtitle[] {
  return subtitles.map((sub) => {
    if (sub.id !== id) return sub;
    const speaker = nextSpeaker(sub.speaker);
    if (speaker == null) {
      const { speaker: _dropped, ...rest } = sub;
      return rest;
    }
    return { ...sub, speaker };
  });
}
