import { describe, expect, it } from "vitest";

import {
  formatEndSeconds,
  formatMsSrt,
  formatMsVtt,
  formatTimestamp,
  parseSecondsToMs,
} from "./format";

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

describe("formatEndSeconds", () => {
  it("formats milliseconds as a decimal seconds string", () => {
    expect(formatEndSeconds(1500)).toBe("1.5");
    expect(formatEndSeconds(10_001)).toBe("10.001");
    expect(formatEndSeconds(2000)).toBe("2");
  });
});

describe("parseSecondsToMs", () => {
  it("parses plain decimal seconds", () => {
    expect(parseSecondsToMs("12.5")).toBe(12_500);
    expect(parseSecondsToMs("1")).toBe(1_000);
    expect(parseSecondsToMs(".5")).toBe(500);
    expect(parseSecondsToMs(" 12.5 ")).toBe(12_500);
    expect(parseSecondsToMs("0")).toBe(0);
  });

  it("rejects invalid input", () => {
    expect(parseSecondsToMs("")).toBeNull();
    expect(parseSecondsToMs("abc")).toBeNull();
    expect(parseSecondsToMs("1e3")).toBeNull();
    expect(parseSecondsToMs("12.5.5")).toBeNull();
    expect(parseSecondsToMs("-5")).toBeNull();
  });
});
