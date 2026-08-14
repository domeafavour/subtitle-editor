import { describe, expect, it } from "vitest";

import { parseSubtitles } from "./storage";

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

  it("preserves a valid speaker", () => {
    const [result] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speaker: "B" },
    ]);
    expect(result?.speaker).toBe("B");
  });

  it("drops a speaker that is not a known label", () => {
    const lowercase = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speaker: "a" },
    ])[0];
    const unknown = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speaker: "D" },
    ])[0];
    expect(lowercase?.speaker).toBeUndefined();
    expect(unknown?.speaker).toBeUndefined();
  });

  it("drops a non-string speaker", () => {
    const [result] = parseSubtitles([
      { id: "a", startMs: 1000, text: "Hi", speaker: 5 },
    ]);
    expect(result?.speaker).toBeUndefined();
  });

  it("keeps entries without a speaker as unassigned", () => {
    const [result] = parseSubtitles([{ id: "a", startMs: 1000, text: "Hi" }]);
    expect(result?.speaker).toBeUndefined();
  });

  it("still drops entries with invalid core fields", () => {
    const result = parseSubtitles([
      { id: "", startMs: 1000, text: "Hi" },
      { id: "b", startMs: -1, text: "Hi" },
      { id: "c", startMs: 1000, text: "   " },
    ]);
    expect(result).toEqual([]);
  });
});
