import type { StateStorage } from "@xstate/store/persist";
import { describe, expect, it } from "vitest";

import { defaultSettings, STORAGE_KEYS } from "#/lib/storage";

import { createSettingsStore } from "./settingsStore";

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

describe("settingsStore", () => {
  it("starts from defaults when storage is empty", () => {
    const store = createSettingsStore(memoryStorage());
    expect(store.getSnapshot().context.settings).toEqual(defaultSettings());
  });

  it("merges partial updates immutably", () => {
    const store = createSettingsStore(memoryStorage());
    const before = store.getSnapshot().context.settings;
    store.trigger.update({ patch: { charsPerSec: 20 } });
    const after = store.getSnapshot().context.settings;
    expect(after.charsPerSec).toBe(20);
    expect(after.minDurationSec).toBe(before.minDurationSec);
    expect(after).not.toBe(before);
  });

  it("persists updates and rehydrates a fresh store from the same storage", () => {
    const storage = memoryStorage();
    const first = createSettingsStore(storage);
    first.trigger.update({ patch: { maxDurationSec: 9 } });

    const second = createSettingsStore(storage);
    expect(second.getSnapshot().context.settings.maxDurationSec).toBe(9);
  });

  it("reads a legacy bare-settings value (old useLocalStorage format)", () => {
    const legacy = JSON.stringify({
      charsPerSec: 12,
      minDurationSec: 2,
      maxDurationSec: 8,
    });
    const store = createSettingsStore(
      memoryStorage({ [STORAGE_KEYS.settings]: legacy }),
    );
    // New fields default in: the end mode stays reading for legacy data.
    expect(store.getSnapshot().context.settings).toEqual({
      charsPerSec: 12,
      minDurationSec: 2,
      maxDurationSec: 8,
      endMode: "reading",
    });
  });

  it("falls back to defaults on a corrupt key", () => {
    const store = createSettingsStore(
      memoryStorage({ [STORAGE_KEYS.settings]: "not-json" }),
    );
    expect(store.getSnapshot().context.settings).toEqual(defaultSettings());
  });
});
