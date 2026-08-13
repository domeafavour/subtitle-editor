import { describe, expect, it } from "vitest";

import { formatMsSrt, formatMsVtt, formatTimestamp } from "./format";

describe("formatMsSrt", () => {
  it("formats minutes, seconds and comma-milliseconds", () => {
    expect(formatMsSrt(65_432)).toBe("00:01:05,432");
  });

  it("pads hours", () => {
    expect(formatMsSrt(3_661_000)).toBe("01:01:01,000");
  });

  it("zero-pads milliseconds", () => {
    expect(formatMsSrt(1001)).toBe("00:00:01,001");
  });
});

describe("formatMsVtt", () => {
  it("formats with dot-milliseconds", () => {
    expect(formatMsVtt(65_432)).toBe("00:01:05.432");
  });

  it("pads hours", () => {
    expect(formatMsVtt(3_661_000)).toBe("01:01:01.000");
  });
});

describe("formatTimestamp", () => {
  it("matches the VTT format for row display", () => {
    expect(formatTimestamp(65_432)).toBe("00:01:05.432");
  });
});
