import { describe, expect, it } from "vitest";

import { parseProjects, parseSettings, parseSubtitles } from "./storage";

describe("parseSubtitles", () => {
  it("preserves a valid manualEndMs override", () => {
    const [result] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", manualEndMs: 2500 },
    ]);
    expect(result?.manualEndMs).toBe(2500);
  });

  it("rounds a fractional manualEndMs", () => {
    const [result] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", manualEndMs: 12345.6 },
    ]);
    expect(result?.manualEndMs).toBe(12346);
  });

  it("drops a non-finite manualEndMs", () => {
    const [result] = parseSubtitles([
      {
        id: "a",
        startMs: 1000,
        text: "Hi",
        manualEndMs: Number.POSITIVE_INFINITY,
      },
    ]);
    expect(result?.manualEndMs).toBeUndefined();
  });

  it("drops a manualEndMs at or before the start", () => {
    const atStart = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", manualEndMs: 1000 },
    ])[0];
    const negative = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", manualEndMs: -5 },
    ])[0];
    expect(atStart?.manualEndMs).toBeUndefined();
    expect(negative?.manualEndMs).toBeUndefined();
  });

  it("drops a non-number manualEndMs", () => {
    const [result] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", manualEndMs: "2500" },
    ]);
    expect(result?.manualEndMs).toBeUndefined();
  });

  it("keeps entries without an override as automatic", () => {
    const [result] = parseSubtitles([{ id: "a", startMs: 1000, text: "Hi" }]);
    expect(result?.manualEndMs).toBeUndefined();
  });

  it("still drops entries with invalid core fields", () => {
    const result = parseSubtitles([
      { id: "", startMs: 1000, text: "Hi" },
      { id: "b", startMs: -1, text: "Hi" },
      { id: "c", startMs: 1000, text: "   " },
    ]);
    expect(result).toEqual([]);
  });

  it("keeps a finite positive speechDurationMs", () => {
    const [result] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speechDurationMs: 2500.6 },
    ]);
    expect(result?.speechDurationMs).toBe(2501);
  });

  it("drops an invalid speechDurationMs", () => {
    const [zero] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speechDurationMs: 0 },
    ]);
    const [negative] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speechDurationMs: -5 },
    ]);
    const [nan] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speechDurationMs: Number.NaN },
    ]);
    expect(zero?.speechDurationMs).toBeUndefined();
    expect(negative?.speechDurationMs).toBeUndefined();
    expect(nan?.speechDurationMs).toBeUndefined();
  });
});

describe("parseSettings", () => {
  it("keeps a valid speech end mode", () => {
    expect(parseSettings({ endMode: "speech" }).endMode).toBe("speech");
  });

  it("falls back to reading for a missing or invalid end mode", () => {
    expect(parseSettings({}).endMode).toBe("reading");
    expect(parseSettings({ endMode: "wat" }).endMode).toBe("reading");
    expect(parseSettings(null).endMode).toBe("reading");
  });

  it("preserves the numeric fields alongside the mode", () => {
    expect(
      parseSettings({
        charsPerSec: 20,
        minDurationSec: 2,
        maxDurationSec: 8,
        endMode: "speech",
      }),
    ).toEqual({
      charsPerSec: 20,
      minDurationSec: 2,
      maxDurationSec: 8,
      endMode: "speech",
      openDraftOnPause: true,
      speechSpeed: 1,
    });
  });

  it("keeps a positive speech speed and falls back to 1 otherwise", () => {
    expect(parseSettings({ speechSpeed: 1.5 }).speechSpeed).toBe(1.5);
    expect(parseSettings({ speechSpeed: 0 }).speechSpeed).toBe(1);
    expect(parseSettings({ speechSpeed: Number.NaN }).speechSpeed).toBe(1);
    expect(parseSettings({}).speechSpeed).toBe(1);
  });
});

describe("parseProjects", () => {
  it("keeps a finite rounded timing offset", () => {
    const [result] = parseProjects([
      {
        id: "a",
        name: "P",
        videoName: "",
        createdAt: 0,
        subtitles: [],
        timingOffsetMs: 1234.6,
      },
    ]);
    expect(result?.timingOffsetMs).toBe(1235);
  });

  it("omits a missing or invalid timing offset (reads as 0)", () => {
    const [missing] = parseProjects([
      { id: "a", name: "P", videoName: "", createdAt: 0, subtitles: [] },
    ]);
    const [invalid] = parseProjects([
      {
        id: "b",
        name: "P",
        videoName: "",
        createdAt: 0,
        subtitles: [],
        timingOffsetMs: Number.NaN,
      },
    ]);
    expect(missing?.timingOffsetMs).toBeUndefined();
    expect(invalid?.timingOffsetMs).toBeUndefined();
  });
});
