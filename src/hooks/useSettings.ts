import { defaultSettings, parseSettings, STORAGE_KEYS } from "#/lib/storage";
import type { Settings } from "#/lib/types";

import { useLocalStorage } from "./useLocalStorage";

export interface SettingsApi {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

/** Reading-speed settings, persisted and merged immutably. */
export function useSettings(): SettingsApi {
  const [settings, setSettings] = useLocalStorage<Settings>(
    STORAGE_KEYS.settings,
    defaultSettings(),
    parseSettings,
  );

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return { settings, update };
}
