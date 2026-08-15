import { describe, expect, it } from "vitest";

import {
  blockGeometry,
  MIN_BLOCK_WIDTH_PX,
  MIN_SCALE_PX_PER_MS,
  MIN_SCALE_REFERENCE_MS,
  playheadPx,
  timelineScale,
} from "./timeline";

describe("blockGeometry", () => {
  it("scales a normal range", () => {
    expect(blockGeometry(1000, 2000, 10_000, 0.01)).toEqual({
      leftPx: 10,
      widthPx: 10,
    });
  });

  it("clamps an end past the duration", () => {
    expect(blockGeometry(9000, 12_000, 10_000, 0.01)).toEqual({
      leftPx: 90,
      widthPx: 10,
    });
  });

  it("clamps a negative start", () => {
    expect(blockGeometry(-500, 1000, 10_000, 0.01)).toEqual({
      leftPx: 0,
      widthPx: 10,
    });
  });

  it("collapses a start past the duration", () => {
    expect(blockGeometry(15_000, 20_000, 10_000, 0.01)).toEqual({
      leftPx: 100,
      widthPx: 0,
    });
  });

  it("returns zero geometry for a zero duration or scale", () => {
    expect(blockGeometry(0, 1000, 0, 0.01)).toEqual({ leftPx: 0, widthPx: 0 });
    expect(blockGeometry(0, 1000, 10_000, 0)).toEqual({
      leftPx: 0,
      widthPx: 0,
    });
  });

  it("keeps a sub-pixel line at its true width (visibility is CSS min-width)", () => {
    // 1ms in a 100s video at the minimum scale is 0.005px wide — the geometry
    // stays honest; the component's `minWidth` is what guarantees visibility.
    expect(blockGeometry(0, 1, 100_000, MIN_SCALE_PX_PER_MS)).toEqual({
      leftPx: 0,
      widthPx: 0.005,
    });
  });

  it("never caps the last line's width at the right edge", () => {
    // The old percentage layout capped a line ending at the video's end to a
    // sub-pixel sliver; pixel layout keeps its true width within the content.
    const { leftPx, widthPx } = blockGeometry(99_900, 100_000, 100_000, 0.005);
    expect(leftPx).toBe(499.5);
    expect(widthPx).toBe(0.5);
    expect(leftPx + widthPx).toBe(100_000 * 0.005);
  });

  it("never exceeds the content width for adversarial inputs", () => {
    const cases: Array<[number, number, number, number]> = [
      [0, 1, 100_000, MIN_SCALE_PX_PER_MS],
      [-1000, 50_000, 10_000, 0.01],
      [9_999, 10_001, 10_000, 0.01],
      [0, 10_000, 10_000, 0.005],
      [5_000, 5_001, 10_000, 0.01],
      [-5, -1, 10_000, 0.01],
    ];
    for (const [start, end, duration, pxPerMs] of cases) {
      const { leftPx, widthPx } = blockGeometry(start, end, duration, pxPerMs);
      expect(leftPx).toBeGreaterThanOrEqual(0);
      expect(widthPx).toBeGreaterThanOrEqual(0);
      expect(leftPx + widthPx).toBeLessThanOrEqual(duration * pxPerMs + 1e-9);
    }
  });
});

describe("timelineScale", () => {
  it("fits a short video to the track", () => {
    const scale = timelineScale(60_000, 800);
    expect(scale).toBeCloseTo(800 / 60_000);
    expect(scale).toBeGreaterThan(MIN_SCALE_PX_PER_MS);
  });

  it("floors at the minimum scale for a long video", () => {
    expect(timelineScale(7_200_000, 800)).toBe(MIN_SCALE_PX_PER_MS);
  });

  it("guarantees a reference line is at least the minimum width", () => {
    const { widthPx } = blockGeometry(
      0,
      MIN_SCALE_REFERENCE_MS,
      7_200_000,
      timelineScale(7_200_000, 800),
    );
    expect(widthPx).toBe(MIN_BLOCK_WIDTH_PX);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(timelineScale(0, 800)).toBe(0);
    expect(timelineScale(60_000, 0)).toBe(0);
  });
});

describe("playheadPx", () => {
  it("scales within the track", () => {
    expect(playheadPx(0, 10_000, 0.01)).toBe(0);
    expect(playheadPx(5_000, 10_000, 0.01)).toBe(50);
  });

  it("clamps out-of-range values", () => {
    expect(playheadPx(-100, 10_000, 0.01)).toBe(0);
    expect(playheadPx(20_000, 10_000, 0.01)).toBe(100);
  });

  it("returns 0 for a zero duration or scale", () => {
    expect(playheadPx(5_000, 0, 0.01)).toBe(0);
    expect(playheadPx(5_000, 10_000, 0)).toBe(0);
  });
});
