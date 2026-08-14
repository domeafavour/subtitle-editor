import type { Project, Settings, Subtitle } from "./types";

/** Versioned localStorage keys — bump the version to migrate a schema. */
export const STORAGE_KEYS = {
  projects: "subtitle-editor.projects.v1",
  settings: "subtitle-editor.settings.v1",
  /** Retired live key; read + cleared only by the one-time legacy migration. */
  legacySubtitles: "subtitle-editor.subtitles.v1",
} as const;

/** English-reading default. The user can adjust all three values. */
export function defaultSettings(): Settings {
  return {
    charsPerSec: 15,
    minDurationSec: 1,
    maxDurationSec: 7,
    // Reading-speed derivation stays the default; speech mode is opt-in.
    endMode: "reading",
    // Pausing opens the draft by default; off means manual adds only.
    openDraftOnPause: true,
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
    const { id, startMs, text, manualEndMs, speechDurationMs } = item as Record<
      string,
      unknown
    >;
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
    // otherwise drop it → the end falls back to the default-end derivation.
    if (typeof manualEndMs === "number" && Number.isFinite(manualEndMs)) {
      const rounded = Math.round(manualEndMs);
      if (rounded > clean.startMs) clean.manualEndMs = rounded;
    }
    // Keep the measured speech duration only when it is a finite positive
    // number; otherwise drop it → the reading estimate is the fallback.
    if (
      typeof speechDurationMs === "number" &&
      Number.isFinite(speechDurationMs) &&
      speechDurationMs > 0
    ) {
      clean.speechDurationMs = Math.round(speechDurationMs);
    }
    result.push(clean);
  }
  return result;
}

/**
 * Validate and repair persisted project data. Entries with missing/blank
 * ids or names are dropped, duplicates are skipped, and field types are
 * repaired (videoName → "", createdAt → 0, subtitles → parseSubtitles).
 */
export function parseProjects(raw: unknown): Project[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Project[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { id, name, videoName, createdAt, subtitles, timingOffsetMs } =
      item as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) continue;
    if (typeof name !== "string" || name.trim().length === 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const project: Project = {
      id,
      name,
      videoName: typeof videoName === "string" ? videoName : "",
      createdAt:
        typeof createdAt === "number" && Number.isFinite(createdAt)
          ? createdAt
          : 0,
      subtitles: parseSubtitles(subtitles),
    };
    // Keep the timing offset only when it is a finite number; otherwise the
    // project reads as offset 0 (no migration needed).
    if (typeof timingOffsetMs === "number" && Number.isFinite(timingOffsetMs)) {
      project.timingOffsetMs = Math.round(timingOffsetMs);
    }
    result.push(project);
  }
  return result;
}

/** Validate persisted settings; invalid or missing fields fall back to defaults. */
export function parseSettings(raw: unknown): Settings {
  const fallback = defaultSettings();
  if (typeof raw !== "object" || raw === null) return fallback;
  const {
    charsPerSec,
    minDurationSec,
    maxDurationSec,
    endMode,
    openDraftOnPause,
  } = raw as Record<string, unknown>;
  return {
    charsPerSec: finiteNumber(charsPerSec) ?? fallback.charsPerSec,
    minDurationSec: finiteNumber(minDurationSec) ?? fallback.minDurationSec,
    maxDurationSec: finiteNumber(maxDurationSec) ?? fallback.maxDurationSec,
    // Any value other than the literal "speech" falls back to "reading".
    endMode: endMode === "speech" ? "speech" : "reading",
    // Only a literal `false` disables the pause draft; anything else is on.
    openDraftOnPause: openDraftOnPause !== false,
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
