import { describe, expect, it } from "vitest";

import { migrateLegacyProject } from "./migration";
import { baseNameOf } from "./project";
import type { Project, Subtitle } from "./types";

const subtitles: Subtitle[] = [{ id: "s1", startMs: 0, text: "Hi" }];

describe("migrateLegacyProject", () => {
  it("wraps legacy subtitles into a project named from the video", () => {
    const { migrated, project } = migrateLegacyProject([], {
      subtitles,
      videoName: "clip.mp4",
    });
    expect(migrated).toBe(true);
    expect(project?.name).toBe("clip");
    expect(project?.videoName).toBe("clip.mp4");
    expect(project?.subtitles).toEqual(subtitles);
  });

  it("falls back to 'Project 1' without a video name", () => {
    const { project } = migrateLegacyProject([], {
      subtitles,
      videoName: null,
    });
    expect(project?.name).toBe("Project 1");
    expect(project?.videoName).toBe("");
  });

  it("does nothing when projects already exist", () => {
    const existing: Project[] = [
      { id: "p", name: "x", videoName: "", createdAt: 1, subtitles: [] },
    ];
    const { migrated, project } = migrateLegacyProject(existing, {
      subtitles,
      videoName: "clip.mp4",
    });
    expect(migrated).toBe(false);
    expect(project).toBeNull();
  });

  it("does nothing when legacy subtitles are empty", () => {
    const { migrated, project } = migrateLegacyProject([], {
      subtitles: [],
      videoName: "clip.mp4",
    });
    expect(migrated).toBe(false);
    expect(project).toBeNull();
  });
});

describe("baseNameOf", () => {
  it("strips one trailing extension", () => {
    expect(baseNameOf("clip.mp4")).toBe("clip");
    expect(baseNameOf("a.b.mp4")).toBe("a.b");
    expect(baseNameOf("noext")).toBe("noext");
    expect(baseNameOf(".hidden")).toBe(".hidden");
  });
});
