import { formatMsVtt } from "./format";
import type { SubtitleWithEnd } from "./types";

/**
 * Serialize to WebVTT (.vtt).
 *
 * The spec mandates LF line endings and a `WEBVTT` header followed by a blank
 * line, with each cue separated by a blank line.
 */
export function toVtt(lines: SubtitleWithEnd[]): string {
  const cues = lines.map(
    (line) =>
      `${formatMsVtt(line.startMs)} --> ${formatMsVtt(line.endMs)}\n${line.text}`,
  );
  return cues.length > 0 ? `WEBVTT\n\n${cues.join("\n\n")}\n` : "WEBVTT\n";
}
