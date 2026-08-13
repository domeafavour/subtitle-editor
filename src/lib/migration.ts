import { baseNameOf, createProjectRecord } from "./project";
import { parseSubtitles, STORAGE_KEYS } from "./storage";
import type { Project, Subtitle } from "./types";

export interface LegacyProjectInput {
  /** Already-validated legacy subtitles (parseSubtitles output). */
  subtitles: Subtitle[];
  /** Name of the legacy video file from the stored handle, if present. */
  videoName: string | null;
}

/**
 * Pure decision for wrapping pre-project data into a project. Returns a
 * project only when there are legacy subtitles and no projects exist yet —
 * existing projects are never augmented with a mystery migration.
 */
export function migrateLegacyProject(
  projects: Project[],
  legacy: LegacyProjectInput,
): { migrated: boolean; project: Project | null } {
  if (projects.length > 0) return { migrated: false, project: null };
  if (legacy.subtitles.length === 0) {
    return { migrated: false, project: null };
  }
  return {
    migrated: true,
    project: createProjectRecord({
      name: legacy.videoName ? baseNameOf(legacy.videoName) : "Project 1",
      videoName: legacy.videoName ?? "",
      subtitles: legacy.subtitles,
    }),
  };
}

/** Read the legacy subtitle list from localStorage (empty on any error). */
export function readLegacySubtitles(): Subtitle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.legacySubtitles);
    if (raw == null) return [];
    return parseSubtitles(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Clear the legacy subtitle key — the migration's commit point. */
export function clearLegacySubtitles(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.legacySubtitles);
  } catch {
    // Storage unavailable — non-fatal.
  }
}
