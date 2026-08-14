import { SPEAKERS, type Speaker } from "./types";

/**
 * Advance a speaker label one step through `none → A → B → C → none`.
 * Used by the per-line speaker button: each click cycles to the next label,
 * and the label after C is none (the line's speaker is cleared).
 */
export function nextSpeaker(current: Speaker | undefined): Speaker | undefined {
  const index = current == null ? -1 : SPEAKERS.indexOf(current);
  const next = index + 1;
  return next >= SPEAKERS.length ? undefined : SPEAKERS[next];
}
