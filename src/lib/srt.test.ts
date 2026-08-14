import { describe, expect, it } from "vitest";

import { toSrt } from "./srt";
import type { SubtitleWithEnd } from "./types";

function line(startMs: number, text: string, endMs: number): SubtitleWithEnd {
  return { id: "id", startMs, text, endMs };
}

describe("toSrt", () => {
  it("renders an empty list as an empty string", () => {
    expect(toSrt([])).toBe("");
  });

  it("numbers blocks from 1 with CRLF line endings", () => {
    const output = toSrt([line(1_000, "Hello", 3_000)]);
    expect(output).toBe("1\r\n00:00:01,000 --> 00:00:03,000\r\nHello\r\n");
  });

  it("separates blocks with a blank line", () => {
    const output = toSrt([
      line(1_000, "First", 3_000),
      line(3_000, "Second", 5_000),
    ]);
    expect(output).toBe(
      "1\r\n00:00:01,000 --> 00:00:03,000\r\nFirst\r\n\r\n" +
        "2\r\n00:00:03,000 --> 00:00:05,000\r\nSecond\r\n",
    );
  });

  it("converts internal newlines to CRLF", () => {
    const output = toSrt([line(1_000, "Line one\nLine two", 3_000)]);
    expect(output).toContain("\r\nLine one\r\nLine two\r\n");
  });

  it("prefixes the body with the speaker on its own first line", () => {
    const output = toSrt([
      { id: "id", startMs: 1_000, text: "Hello", endMs: 3_000, speaker: "A" },
    ]);
    expect(output).toBe(
      "1\r\n00:00:01,000 --> 00:00:03,000\r\n- A\r\nHello\r\n",
    );
  });

  it("prefixes the speaker before multi-line text with CRLF endings", () => {
    const output = toSrt([
      {
        id: "id",
        startMs: 1_000,
        text: "Line one\nLine two",
        endMs: 3_000,
        speaker: "B",
      },
    ]);
    expect(output).toBe(
      "1\r\n00:00:01,000 --> 00:00:03,000\r\n- B\r\nLine one\r\nLine two\r\n",
    );
  });
});
