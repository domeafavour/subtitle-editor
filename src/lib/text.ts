/**
 * Text helpers for subtitle content.
 */

/**
 * Normalize raw input before it becomes a subtitle's text.
 * Trims surrounding whitespace and replaces `-->` (the SRT/VTT cue separator)
 * with an arrow so a cue body can never be mistaken for a timing line.
 */
export function sanitizeText(raw: string): string {
  return raw.trim().replaceAll("-->", "→");
}

/** True when the raw input is worth committing (has non-whitespace content). */
export function isMeaningful(raw: string): boolean {
  return raw.trim().length > 0;
}
