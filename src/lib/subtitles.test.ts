import { describe, expect, it } from "vitest";

import {
  addSubtitle,
  nudgeSubtitleStart,
  removeSubtitle,
  setSpeechDurationMs,
  setSubtitleManualEnd,
  updateSubtitleText,
} from "./subtitles";
import type { Subtitle } from "./types";

function sub(id: string, startMs = 0, text = "Hi"): Subtitle {
  return { id, startMs, text };
}

describe("addSubtitle", () => {
  it("appends and rounds the start time", () => {
    const result = addSubtitle([sub("a")], 10.6, "New line");
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ startMs: 11, text: "New line" });
  });

  it("uses the provided id when given", () => {
    const result = addSubtitle([], 1000, "Hello", "my-line");
    expect(result[0]?.id).toBe("my-line");
  });

  it("rejects empty/whitespace text and returns the same array", () => {
    const list = [sub("a")];
    expect(addSubtitle(list, 0, "   ")).toBe(list);
  });
});

describe("updateSubtitleText", () => {
  it("replaces text", () => {
    const result = updateSubtitleText([sub("a")], "a", "Updated");
    expect(result[0]?.text).toBe("Updated");
  });
});

describe("setSubtitleManualEnd", () => {
  it("sets an override", () => {
    const result = setSubtitleManualEnd([sub("a", 1000)], "a", 3000);
    expect(result[0]?.manualEndMs).toBe(3000);
  });

  it("clears an override with null", () => {
    const withOverride: Subtitle = {
      id: "a",
      startMs: 1000,
      text: "Hi",
      manualEndMs: 3000,
    };
    const result = setSubtitleManualEnd([withOverride], "a", null);
    expect(result[0]?.manualEndMs).toBeUndefined();
  });

  it("rejects an override at or before the start", () => {
    const list = [sub("a", 1000)];
    expect(
      setSubtitleManualEnd(list, "a", 1000)[0]?.manualEndMs,
    ).toBeUndefined();
    expect(
      setSubtitleManualEnd(list, "a", 500)[0]?.manualEndMs,
    ).toBeUndefined();
  });
});

describe("setSpeechDurationMs", () => {
  it("stores a rounded measured duration", () => {
    const result = setSpeechDurationMs([sub("a")], "a", 2450.6);
    expect(result[0]?.speechDurationMs).toBe(2451);
  });

  it("rejects non-positive or non-finite durations", () => {
    const list = [sub("a")];
    expect(
      setSpeechDurationMs(list, "a", 0)[0]?.speechDurationMs,
    ).toBeUndefined();
    expect(
      setSpeechDurationMs(list, "a", -5)[0]?.speechDurationMs,
    ).toBeUndefined();
    expect(
      setSpeechDurationMs(list, "a", Number.NaN)[0]?.speechDurationMs,
    ).toBeUndefined();
  });

  it("ignores unknown ids and returns the same array reference", () => {
    const list = [sub("a")];
    expect(setSpeechDurationMs(list, "nope", 1000)).toBe(list);
  });
});

describe("nudgeSubtitleStart", () => {
  it("moves the start", () => {
    const result = nudgeSubtitleStart([sub("a", 1000)], "a", 100);
    expect(result[0]?.startMs).toBe(1100);
  });

  it("clamps at zero", () => {
    const result = nudgeSubtitleStart([sub("a", 100)], "a", -200);
    expect(result[0]?.startMs).toBe(0);
  });

  it("clears an override its start would cross", () => {
    const withOverride: Subtitle = {
      id: "a",
      startMs: 1000,
      text: "Hi",
      manualEndMs: 1100,
    };
    const result = nudgeSubtitleStart([withOverride], "a", 200);
    expect(result[0]?.startMs).toBe(1200);
    expect(result[0]?.manualEndMs).toBeUndefined();
  });
});

describe("removeSubtitle", () => {
  it("filters by id", () => {
    const result = removeSubtitle([sub("a"), sub("b")], "a");
    expect(result.map((s) => s.id)).toEqual(["b"]);
  });
});
