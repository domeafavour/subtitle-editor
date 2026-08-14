import { createStore } from "@xstate/store";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "@xstate/store/persist";

import { defaultSettings, parseSettings, STORAGE_KEYS } from "#/lib/storage";
import type { Settings } from "#/lib/types";

interface SettingsContext {
  settings: Settings;
}

/**
 * Global reading-speed settings. Persisted to localStorage through
 * `@xstate/store/persist`; the `merge` reuses `parseSettings` on rehydrate so a
 * corrupt key falls back to defaults exactly like the old `useLocalStorage`
 * path. Sync storage hydrates in the initial snapshot — no first-paint flash.
 */
export function createSettingsStore(storage?: StateStorage) {
  return createStore({
    context: { settings: defaultSettings() } as SettingsContext,
    on: {
      update: (context, event: { patch: Partial<Settings> }) => ({
        ...context,
        settings: { ...context.settings, ...event.patch },
      }),
    },
  }).with(
    persist({
      name: STORAGE_KEYS.settings,
      storage: storage ?? createJSONStorage(() => localStorage),
      pick: (context) => ({ settings: context.settings }),
      // The old useLocalStorage wrote the bare Settings object, not the
      // `{ context, version }` envelope persist expects — adapt on read so
      // existing data survives the upgrade with no migration.
      deserialize: (str) => {
        const parsed: unknown = JSON.parse(str);
        if (
          parsed != null &&
          typeof parsed === "object" &&
          !("context" in parsed)
        ) {
          return { context: { settings: parsed as Settings }, version: 0 };
        }
        return parsed as { context: Partial<SettingsContext>; version: number };
      },
      merge: (persisted, current) => ({
        ...current,
        settings: parseSettings(persisted.settings),
      }),
    }),
  );
}

/** The app-wide singleton. */
export const settingsStore = createSettingsStore();
