import { describe, expect, it } from "vitest";

import { blockGeometry, playheadPercent } from "./timeline";

describe("blockGeometry", () => {
  it("scales a normal range", () => {
    expect(blockGeometry(1000, 2000, 10_000)).toEqual({
      leftPercent: 10,
      widthPercent: 10,
    });
  });

  it("clamps an end past the duration", () => {
    expect(blockGeometry(9000, 12_000, 10_000)).toEqual({
      leftPercent: 90,
      widthPercent: 10,
    });
  });

  it("clamps a negative start", () => {
    expect(blockGeometry(-500, 1000, 10_000)).toEqual({
      leftPercent: 0,
      widthPercent: 10,
    });
  });

  it("collapses a start past the duration", () => {
    expect(blockGeometry(15_000, 20_000, 10_000)).toEqual({
      leftPercent: 100,
      widthPercent: 0,
    });
  });

  it("returns zero geometry for a zero duration", () => {
    expect(blockGeometry(0, 1000, 0)).toEqual({
      leftPercent: 0,
      widthPercent: 0,
    });
  });

  it("applies the min-width to a sub-pixel line", () => {
    expect(blockGeometry(0, 1, 100_000)).toEqual({
      leftPercent: 0,
      widthPercent: 0.5,
    });
  });

  it("caps the min-width at the right edge", () => {
    const { leftPercent, widthPercent } = blockGeometry(
      99_900,
      99_901,
      100_000,
    );
    expect(widthPercent).toBeCloseTo(0.1);
    expect(leftPercent + widthPercent).toBeLessThanOrEqual(100);
  });

  it("never overflows for adversarial inputs", () => {
    const cases: Array<[number, number, number]> = [
      [0, 1, 100_000],
      [-1000, 50_000, 10_000],
      [9_999, 10_001, 10_000],
      [0, 10_000, 10_000],
      [5_000, 5_001, 10_000],
      [-5, -1, 10_000],
    ];
    for (const [start, end, duration] of cases) {
      const { leftPercent, widthPercent } = blockGeometry(start, end, duration);
      expect(leftPercent).toBeGreaterThanOrEqual(0);
      expect(leftPercent + widthPercent).toBeLessThanOrEqual(100.0001);
    }
  });
});

describe("playheadPercent", () => {
  it("scales within the track", () => {
    expect(playheadPercent(0, 10_000)).toBe(0);
    expect(playheadPercent(5_000, 10_000)).toBe(50);
  });

  it("clamps out-of-range values", () => {
    expect(playheadPercent(-100, 10_000)).toBe(0);
    expect(playheadPercent(20_000, 10_000)).toBe(100);
  });

  it("returns 0 for a zero duration", () => {
    expect(playheadPercent(5_000, 0)).toBe(0);
  });
});
