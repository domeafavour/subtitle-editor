import { formatMsSrt } from "./format";
import type { SubtitleWithEnd } from "./types";

/**
 * Serialize to SubRip (.srt).
 *
 * Uses CRLF line endings for maximum compatibility with legacy players, and
 * numeric block numbering starting at 1.
 */
export function toSrt(lines: SubtitleWithEnd[]): string {
  const blocks = lines.map((line, i) => {
    const timing = `${formatMsSrt(line.startMs)} --> ${formatMsSrt(line.endMs)}`;
    const body = line.text.replaceAll("\n", "\r\n");
    return `${i + 1}\r\n${timing}\r\n${body}`;
  });
  return blocks.length > 0 ? `${blocks.join("\r\n\r\n")}\r\n` : "";
}
