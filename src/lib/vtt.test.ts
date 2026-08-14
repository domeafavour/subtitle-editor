import { describe, expect, it } from "vitest";

import type { SubtitleWithEnd } from "./types";
import { toVtt } from "./vtt";

function line(startMs: number, text: string, endMs: number): SubtitleWithEnd {
  return { id: "id", startMs, text, endMs };
}

describe("toVtt", () => {
  it("renders an empty list as just the WEBVTT header", () => {
    expect(toVtt([])).toBe("WEBVTT\n");
  });

  it("emits the header, blank line, and LF-separated cues", () => {
    const output = toVtt([line(1_000, "Hello", 3_000)]);
    expect(output).toBe("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello\n");
  });

  it("separates cues with a blank line", () => {
    const output = toVtt([
      line(1_000, "First", 3_000),
      line(3_000, "Second", 5_000),
    ]);
    expect(output).toBe(
      "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nFirst\n\n" +
        "00:00:03.000 --> 00:00:05.000\nSecond\n",
    );
  });
});
