import type { StateStorage } from "@xstate/store/persist";
import { describe, expect, it } from "vitest";

import { createProjectRecord } from "#/lib/project";
import { STORAGE_KEYS } from "#/lib/storage";
import { addSubtitle } from "#/lib/subtitles";

import { createProjectsStore } from "./projectsStore";

function memoryStorage(initial: Record<string, string> = {}): StateStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (name) => data.get(name) ?? null,
    setItem: (name, value) => {
      data.set(name, value);
    },
    removeItem: (name) => {
      data.delete(name);
    },
  };
}

function project(videoName = "clip.mp4") {
  return createProjectRecord({ videoName });
}

describe("projectsStore", () => {
  it("starts empty when storage is empty", () => {
    const store = createProjectsStore(memoryStorage());
    expect(store.getSnapshot().context.projects).toEqual([]);
  });

  it("creates a project at the front", () => {
    const store = createProjectsStore(memoryStorage());
    const p = project();
    store.trigger.createProject({ project: p });
    expect(store.getSnapshot().context.projects[0]?.id).toBe(p.id);
  });

  it("renames a project (trimmed) and no-ops on blank names", () => {
    const store = createProjectsStore(memoryStorage());
    const p = project();
    store.trigger.createProject({ project: p });
    store.trigger.renameProject({ id: p.id, name: "  New name  " });
    expect(store.getSnapshot().context.projects[0]?.name).toBe("New name");

    const before = store.getSnapshot().context.projects;
    store.trigger.renameProject({ id: p.id, name: "   " });
    expect(store.getSnapshot().context.projects).toBe(before);
  });

  it("deletes a project", () => {
    const store = createProjectsStore(memoryStorage());
    const a = project("a.mp4");
    const b = project("b.mp4");
    store.trigger.createProject({ project: a });
    store.trigger.createProject({ project: b });
    store.trigger.deleteProject({ id: a.id });
    expect(store.getSnapshot().context.projects.map((p) => p.id)).toEqual([
      b.id,
    ]);
  });

  it("updates subtitles through an updater and skips no-op mutations", () => {
    const store = createProjectsStore(memoryStorage());
    const p = project();
    store.trigger.createProject({ project: p });
    store.trigger.updateSubtitles({
      id: p.id,
      updater: (prev) => addSubtitle(prev, 0, "Hello"),
    });
    expect(store.getSnapshot().context.projects[0]?.subtitles).toHaveLength(1);

    // A no-op updater keeps the project object (and its subtitles) unchanged.
    const before = store.getSnapshot().context.projects[0];
    store.trigger.updateSubtitles({ id: p.id, updater: (prev) => prev });
    expect(store.getSnapshot().context.projects[0]).toBe(before);
  });

  it("persists projects and rehydrates a fresh store", () => {
    const storage = memoryStorage();
    const first = createProjectsStore(storage);
    const p = project();
    first.trigger.createProject({ project: p });

    const second = createProjectsStore(storage);
    expect(second.getSnapshot().context.projects[0]?.id).toBe(p.id);
  });

  it("reads a legacy bare-array value (old useLocalStorage format)", () => {
    const p = project();
    const legacy = JSON.stringify([{ ...p, name: "Legacy" }]);
    const store = createProjectsStore(
      memoryStorage({ [STORAGE_KEYS.projects]: legacy }),
    );
    expect(store.getSnapshot().context.projects).toHaveLength(1);
    expect(store.getSnapshot().context.projects[0]?.name).toBe("Legacy");
  });

  it("drops corrupt entries through parseProjects on rehydrate", () => {
    const legacy = JSON.stringify([
      { id: "", name: "bad" },
      { id: "x", name: "ok" },
    ]);
    const store = createProjectsStore(
      memoryStorage({ [STORAGE_KEYS.projects]: legacy }),
    );
    const projects = store.getSnapshot().context.projects;
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe("x");
  });

  it("tracks the migration flag", () => {
    const store = createProjectsStore(memoryStorage());
    expect(store.getSnapshot().context.isMigrating).toBe(false);
    store.trigger.setMigrating({ isMigrating: true });
    expect(store.getSnapshot().context.isMigrating).toBe(true);
  });
});
