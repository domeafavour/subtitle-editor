import { describe, expect, it } from "vitest";

import {
  baseDurationMs,
  effectiveEndMs,
  lineAtPosition,
  lineContaining,
  previousLineStartMs,
  sortedWithEnds,
} from "./timing";
import type { Settings, Subtitle, SubtitleWithEnd } from "./types";

const settings: Settings = {
  charsPerSec: 15,
  minDurationSec: 1,
  maxDurationSec: 7,
  endMode: "reading",
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
      endMode: "reading",
    };
    expect(baseDurationMs("a".repeat(30), swapped)).toBe(2000);
  });

  it("falls back to the max duration for a non-positive rate", () => {
    const broken: Settings = {
      charsPerSec: 0,
      minDurationSec: 1,
      maxDurationSec: 7,
      endMode: "reading",
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

describe("effectiveEndMs — speech mode", () => {
  const speechSettings: Settings = { ...settings, endMode: "speech" };

  function spoken(id: string, startMs: number, text: string, duration: number) {
    return { ...sub(id, startMs, text), speechDurationMs: duration };
  }

  it("uses the measured speech duration when present", () => {
    expect(
      effectiveEndMs(spoken("a", 10_000, "hello", 2_500), null, speechSettings),
    ).toBe(12_500);
  });

  it("falls back to the reading estimate when unmeasured", () => {
    expect(
      effectiveEndMs(sub("a", 10_000, "a".repeat(30)), null, speechSettings),
    ).toBe(12_000);
  });

  it("clamps to the next line's start and floors to a positive duration", () => {
    expect(
      effectiveEndMs(
        spoken("a", 10_000, "hello", 2_500),
        11_000,
        speechSettings,
      ),
    ).toBe(11_000);
    expect(effectiveEndMs(sub("a", 10_000, "x"), 10_000, speechSettings)).toBe(
      10_001,
    );
  });

  it("keeps the manual override in speech mode", () => {
    expect(
      effectiveEndMs(
        { ...manualSub("a", 10_000, "x", 15_000), speechDurationMs: 2_500 },
        null,
        speechSettings,
      ),
    ).toBe(15_000);
  });

  it("ignores the speech duration in reading mode", () => {
    // 5-char line at 15 chars/sec → clamped to the 1s minimum.
    expect(
      effectiveEndMs(spoken("a", 10_000, "hello", 2_500), null, settings),
    ).toBe(11_000);
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

  it("shifts every line's times by the timing offset", () => {
    const lines = [
      manualSub("a", 0, "a".repeat(30), 5_000),
      sub("b", 3_000, "b"),
    ];
    const result = sortedWithEnds(lines, settings, 1_000);
    expect(result[0].startMs).toBe(1_000);
    // A's override (5000) clamped to B's shifted start (4000).
    expect(result[0].endMs).toBe(4_000);
    expect(result[0].manualEndMs).toBe(6_000);
    expect(result[1].startMs).toBe(4_000);
    expect(result[1].endMs).toBe(5_000);
    expect(result[1].manualEndMs).toBeUndefined();
  });

  it("clamps shifted starts at zero and keeps a positive duration", () => {
    const lines = [sub("a", 500, "hello"), sub("b", 2_000, "hi")];
    const result = sortedWithEnds(lines, settings, -1_000);
    expect(result[0].startMs).toBe(0);
    // endMs keeps the start + 1 floor even under a heavy negative offset.
    expect(result[0].endMs).toBeGreaterThanOrEqual(1);
    expect(result[1].startMs).toBe(1_000);
  });

  it("leaves lines unchanged with a zero offset", () => {
    const lines = [sub("a", 500, "hello"), sub("b", 2_000, "hi")];
    expect(sortedWithEnds(lines, settings, 0)).toEqual(
      sortedWithEnds(lines, settings),
    );
  });
});

describe("lineAtPosition", () => {
  const fixture: SubtitleWithEnd[] = [
    { id: "a", startMs: 0, text: "a", endMs: 1000 },
    { id: "b", startMs: 2000, text: "b", endMs: 3000 },
    { id: "c", startMs: 4000, text: "c", endMs: 5000 },
  ];

  it("returns the line containing the position (start inclusive)", () => {
    expect(lineAtPosition(fixture, 0)?.id).toBe("a");
    expect(lineAtPosition(fixture, 999)?.id).toBe("a");
    expect(lineAtPosition(fixture, 2000)?.id).toBe("b");
    expect(lineAtPosition(fixture, 2500)?.id).toBe("b");
    expect(lineAtPosition(fixture, 4999)?.id).toBe("c");
  });

  it("treats the end as exclusive — the boundary belongs to the next line", () => {
    expect(lineAtPosition(fixture, 1000)?.id).toBe("b");
    expect(lineAtPosition(fixture, 3000)?.id).toBe("c");
  });

  it("returns the next line when the position is in a gap", () => {
    expect(lineAtPosition(fixture, 1500)?.id).toBe("b");
    expect(lineAtPosition(fixture, 3500)?.id).toBe("c");
  });

  it("returns the first line when before the first line", () => {
    const late: SubtitleWithEnd[] = [
      { id: "x", startMs: 2000, text: "x", endMs: 3000 },
      { id: "y", startMs: 4000, text: "y", endMs: 5000 },
    ];
    expect(lineAtPosition(late, 0)?.id).toBe("x");
    expect(lineAtPosition(late, 1999)?.id).toBe("x");
  });

  it("returns the last line past the last line", () => {
    expect(lineAtPosition(fixture, 5000)?.id).toBe("c");
    expect(lineAtPosition(fixture, 99_999)?.id).toBe("c");
  });

  it("returns null for an empty list", () => {
    expect(lineAtPosition([], 0)).toBeNull();
    expect(lineAtPosition([], 12_345)).toBeNull();
  });
});

describe("previousLineStartMs", () => {
  const fixture: SubtitleWithEnd[] = [
    { id: "a", startMs: 0, text: "a", endMs: 1000 },
    { id: "b", startMs: 2000, text: "b", endMs: 3000 },
    { id: "c", startMs: 4000, text: "c", endMs: 5000 },
  ];

  it("returns the current line's start from inside it", () => {
    expect(previousLineStartMs(fixture, 500)).toBe(0);
    expect(previousLineStartMs(fixture, 999)).toBe(0);
    expect(previousLineStartMs(fixture, 2500)).toBe(2000);
  });

  it("at a line's start moves to the previous line's start (vim b)", () => {
    expect(previousLineStartMs(fixture, 2000)).toBe(0);
    expect(previousLineStartMs(fixture, 4000)).toBe(2000);
  });

  it("in a gap returns the previous line's start", () => {
    expect(previousLineStartMs(fixture, 1500)).toBe(0);
    expect(previousLineStartMs(fixture, 3500)).toBe(2000);
  });

  it("returns null before or at the first line's start", () => {
    expect(previousLineStartMs(fixture, 0)).toBeNull();
    expect(previousLineStartMs(fixture, -100)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(previousLineStartMs([], 0)).toBeNull();
  });
});

describe("lineContaining", () => {
  const fixture: SubtitleWithEnd[] = [
    { id: "a", startMs: 0, text: "a", endMs: 1000 },
    { id: "b", startMs: 2000, text: "b", endMs: 3000 },
    { id: "c", startMs: 4000, text: "c", endMs: 5000 },
  ];

  it("returns the line containing the position (start inclusive)", () => {
    expect(lineContaining(fixture, 0)?.id).toBe("a");
    expect(lineContaining(fixture, 999)?.id).toBe("a");
    expect(lineContaining(fixture, 2500)?.id).toBe("b");
  });

  it("returns null at a boundary that falls in a gap", () => {
    expect(lineContaining(fixture, 1000)).toBeNull();
    expect(lineContaining(fixture, 3000)).toBeNull();
  });

  it("returns the next line at a boundary contiguous with it", () => {
    const contiguous: SubtitleWithEnd[] = [
      { id: "a", startMs: 0, text: "a", endMs: 1000 },
      { id: "b", startMs: 1000, text: "b", endMs: 2000 },
    ];
    expect(lineContaining(contiguous, 1000)?.id).toBe("b");
  });

  it("returns null in a gap between lines", () => {
    expect(lineContaining(fixture, 1500)).toBeNull();
    expect(lineContaining(fixture, 3500)).toBeNull();
  });

  it("returns null before the first line", () => {
    const late: SubtitleWithEnd[] = [
      { id: "x", startMs: 2000, text: "x", endMs: 3000 },
      { id: "y", startMs: 4000, text: "y", endMs: 5000 },
    ];
    expect(lineContaining(late, 0)).toBeNull();
  });

  it("returns null past the last line", () => {
    expect(lineContaining(fixture, 5000)).toBeNull();
    expect(lineContaining(fixture, 99_999)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(lineContaining([], 0)).toBeNull();
  });
});
