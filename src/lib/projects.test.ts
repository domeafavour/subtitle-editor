import { describe, expect, it } from "vitest";

import { parseProjects } from "./storage";

describe("parseProjects", () => {
  it("round-trips a valid project", () => {
    const [result] = parseProjects([
      {
        id: "p1",
        name: "Clip",
        videoName: "clip.mp4",
        createdAt: 1000,
        subtitles: [{ id: "s1", startMs: 0, text: "Hi" }],
      },
    ]);
    expect(result?.id).toBe("p1");
    expect(result?.name).toBe("Clip");
    expect(result?.videoName).toBe("clip.mp4");
    expect(result?.createdAt).toBe(1000);
    expect(result?.subtitles).toEqual([{ id: "s1", startMs: 0, text: "Hi" }]);
  });

  it("drops entries with a missing or blank id/name", () => {
    expect(parseProjects([{ name: "x" }])).toEqual([]);
    expect(parseProjects([{ id: "", name: "x" }])).toEqual([]);
    expect(parseProjects([{ id: "p", name: "  " }])).toEqual([]);
  });

  it("repairs invalid videoName and createdAt", () => {
    const [result] = parseProjects([
      { id: "p", name: "x", videoName: 5, createdAt: Number.NaN },
    ]);
    expect(result?.videoName).toBe("");
    expect(result?.createdAt).toBe(0);
  });

  it("returns an empty array for non-array input", () => {
    expect(parseProjects("nope")).toEqual([]);
    expect(parseProjects(null)).toEqual([]);
  });

  it("runs garbage subtitles through parseSubtitles", () => {
    const [result] = parseProjects([
      {
        id: "p",
        name: "x",
        subtitles: [
          { id: "s", startMs: 0, text: "Hi" },
          "junk",
          { id: "", startMs: 0, text: "x" },
        ],
      },
    ]);
    expect(result?.subtitles).toEqual([{ id: "s", startMs: 0, text: "Hi" }]);
  });

  it("drops duplicate ids", () => {
    const result = parseProjects([
      { id: "p", name: "One" },
      { id: "p", name: "Two" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("One");
  });
});
