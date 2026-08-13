import type { Settings, Subtitle } from "./types";

/** Versioned localStorage keys — bump the version to migrate a schema. */
export const STORAGE_KEYS = {
  subtitles: "subtitle-editor.subtitles.v1",
  settings: "subtitle-editor.settings.v1",
} as const;

/** English-reading default. The user can adjust all three values. */
export function defaultSettings(): Settings {
  return {
    charsPerSec: 15,
    minDurationSec: 1,
    maxDurationSec: 7,
  };
}

/**
 * Validate and repair persisted subtitle data. Non-objects, entries with
 * invalid ids/starts, and empty text are dropped — a corrupted key must never
 * crash the app or poison the list.
 */
export function parseSubtitles(raw: unknown): Subtitle[] {
  if (!Array.isArray(raw)) return [];
  const result: Subtitle[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { id, startMs, text, manualEndMs } = item as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) continue;
    if (
      typeof startMs !== "number" ||
      !Number.isFinite(startMs) ||
      startMs < 0
    ) {
      continue;
    }
    if (typeof text !== "string" || text.trim().length === 0) continue;
    const clean: Subtitle = { id, startMs: Math.round(startMs), text };
    // Keep the override only when it is a finite number later than the start;
    // otherwise drop it → the end falls back to the reading-speed derivation.
    if (typeof manualEndMs === "number" && Number.isFinite(manualEndMs)) {
      const rounded = Math.round(manualEndMs);
      if (rounded > clean.startMs) clean.manualEndMs = rounded;
    }
    result.push(clean);
  }
  return result;
}

/** Validate persisted settings; invalid or missing fields fall back to defaults. */
export function parseSettings(raw: unknown): Settings {
  const fallback = defaultSettings();
  if (typeof raw !== "object" || raw === null) return fallback;
  const { charsPerSec, minDurationSec, maxDurationSec } = raw as Record<
    string,
    unknown
  >;
  return {
    charsPerSec: finiteNumber(charsPerSec) ?? fallback.charsPerSec,
    minDurationSec: finiteNumber(minDurationSec) ?? fallback.minDurationSec,
    maxDurationSec: finiteNumber(maxDurationSec) ?? fallback.maxDurationSec,
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
