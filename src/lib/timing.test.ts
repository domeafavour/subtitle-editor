import { describe, expect, it } from "vitest";

import { baseDurationMs, effectiveEndMs, sortedWithEnds } from "./timing";
import type { Settings, Subtitle } from "./types";

const settings: Settings = {
  charsPerSec: 15,
  minDurationSec: 1,
  maxDurationSec: 7,
};

function sub(id: string, startMs: number, text: string): Subtitle {
  return { id, startMs, text };
}

function manualSub(
  id: string,
  startMs: number,
  text: string,
  manualEndMs: number,
): Subtitle {
  return { id, startMs, text, manualEndMs };
}

describe("baseDurationMs", () => {
  it("divides character count by the reading rate", () => {
    expect(baseDurationMs("a".repeat(30), settings)).toBe(2000);
  });

  it("clamps to the minimum duration", () => {
    expect(baseDurationMs("abc", settings)).toBe(1000);
  });

  it("clamps to the maximum duration", () => {
    expect(baseDurationMs("a".repeat(200), settings)).toBe(7000);
  });

  it("normalizes a swapped min/max", () => {
    const swapped: Settings = {
      charsPerSec: 15,
      minDurationSec: 7,
      maxDurationSec: 1,
    };
    expect(baseDurationMs("a".repeat(30), swapped)).toBe(2000);
  });

  it("falls back to the max duration for a non-positive rate", () => {
    const broken: Settings = {
      charsPerSec: 0,
      minDurationSec: 1,
      maxDurationSec: 7,
    };
    expect(baseDurationMs("hello", broken)).toBe(7000);
  });
});

describe("effectiveEndMs", () => {
  it("uses the reading estimate when nothing follows", () => {
    expect(
      effectiveEndMs(sub("a", 10_000, "a".repeat(30)), null, settings),
    ).toBe(12_000);
  });

  it("clamps to the next line's start when it is earlier", () => {
    expect(
      effectiveEndMs(sub("a", 10_000, "a".repeat(30)), 11_500, settings),
    ).toBe(11_500);
  });

  it("keeps the reading estimate when the next line is later", () => {
    expect(
      effectiveEndMs(sub("a", 10_000, "a".repeat(30)), 13_500, settings),
    ).toBe(12_000);
  });

  it("guarantees a positive duration even for equal starts", () => {
    expect(effectiveEndMs(sub("a", 10_000, "hello"), 10_000, settings)).toBe(
      10_001,
    );
  });

  it("uses the manual override when nothing follows", () => {
    expect(
      effectiveEndMs(manualSub("a", 10_000, "x", 15_000), null, settings),
    ).toBe(15_000);
  });

  it("clamps the manual override to an earlier next start", () => {
    expect(
      effectiveEndMs(manualSub("a", 10_000, "x", 15_000), 12_000, settings),
    ).toBe(12_000);
  });

  it("keeps the manual override when the next line is later", () => {
    expect(
      effectiveEndMs(manualSub("a", 10_000, "x", 15_000), 20_000, settings),
    ).toBe(15_000);
  });

  it("floors a manual override to a positive duration", () => {
    expect(
      effectiveEndMs(manualSub("a", 10_000, "x", 10_000), null, settings),
    ).toBe(10_001);
    expect(
      effectiveEndMs(manualSub("a", 10_000, "x", 9_000), null, settings),
    ).toBe(10_001);
  });

  it("derives from reading speed when no override is set", () => {
    expect(
      effectiveEndMs(sub("a", 10_000, "a".repeat(30)), null, settings),
    ).toBe(12_000);
  });
});

describe("sortedWithEnds", () => {
  it("sorts chronologically and attaches derived ends", () => {
    const lines = [sub("b", 5_000, "bbb"), sub("a", 1_000, "aaa")];
    const result = sortedWithEnds(lines, settings);
    expect(result.map((line) => line.id)).toEqual(["a", "b"]);
    expect(result[0].endMs).toBe(2_000);
    expect(result[1].endMs).toBe(6_000);
  });

  it("breaks start-time ties deterministically by id", () => {
    const result = sortedWithEnds(
      [sub("z", 1_000, "x"), sub("a", 1_000, "x")],
      settings,
    );
    expect(result.map((line) => line.id)).toEqual(["a", "z"]);
  });

  it("reflows the previous line when the next line is removed", () => {
    const lines = [sub("a", 0, "a".repeat(30)), sub("b", 1_500, "b")];
    expect(sortedWithEnds(lines, settings)[0].endMs).toBe(1_500);
    expect(sortedWithEnds([lines[0]], settings)[0].endMs).toBe(2_000);
  });

  it("does not mutate the input array", () => {
    const lines = [sub("b", 5_000, "b"), sub("a", 1_000, "a")];
    sortedWithEnds(lines, settings);
    expect(lines.map((line) => line.id)).toEqual(["b", "a"]);
  });

  it("honors manual overrides and carries them through", () => {
    const lines = [
      manualSub("a", 0, "a".repeat(30), 5_000),
      sub("b", 3_000, "b"),
    ];
    const result = sortedWithEnds(lines, settings);
    // A's override (5000) is clamped to B's start (3000); B stays derived.
    expect(result[0].endMs).toBe(3_000);
    expect(result[0].manualEndMs).toBe(5_000);
    expect(result[1].endMs).toBe(4_000);
    expect(result[1].manualEndMs).toBeUndefined();
  });
});
