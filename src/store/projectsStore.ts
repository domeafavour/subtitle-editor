import { createStore } from "@xstate/store";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "@xstate/store/persist";

import { readLegacySubtitles } from "#/lib/migration";
import { parseProjects, STORAGE_KEYS } from "#/lib/storage";
import type { Project, Subtitle } from "#/lib/types";

interface ProjectsContext {
  projects: Project[];
  /** True while the one-time legacy migration runs. */
  isMigrating: boolean;
}

export type SubtitleUpdater = (prev: Subtitle[]) => Subtitle[];

/**
 * The single source of truth for projects and their subtitles. Persisted to
 * localStorage via `@xstate/store/persist` (only `projects`, never the
 * transient `isMigrating` flag); the `merge` reuses `parseProjects` on
 * rehydrate so corrupt data is dropped rather than crashing the app. Pure
 * mutators in `src/lib/subtitles.ts` are reused as the `updateSubtitles`
 * updater implementations.
 *
 * Side effects (IndexedDB video handles) are NOT part of the store — callers
 * fire `storeHandle`/`deleteHandle` around the matching triggers, as before.
 */
export function createProjectsStore(storage?: StateStorage) {
  return createStore({
    context: {
      projects: [],
      // Mirrors the old hook's spinner: show "Checking for existing data…"
      // while there is legacy data that the one-time migration may wrap up.
      isMigrating: readLegacySubtitles().length > 0,
    } as ProjectsContext,
    on: {
      createProject: (context, event: { project: Project }) => ({
        ...context,
        projects: [event.project, ...context.projects],
      }),
      renameProject: (context, event: { id: string; name: string }) => {
        const trimmed = event.name.trim();
        if (trimmed.length === 0) return context;
        return {
          ...context,
          projects: context.projects.map((project) =>
            project.id === event.id ? { ...project, name: trimmed } : project,
          ),
        };
      },
      updateVideoName: (context, event: { id: string; videoName: string }) => {
        if (event.videoName.length === 0) return context;
        return {
          ...context,
          projects: context.projects.map((project) =>
            project.id === event.id
              ? { ...project, videoName: event.videoName }
              : project,
          ),
        };
      },
      setTimingOffset: (context, event: { id: string; offsetMs: number }) => {
        if (!Number.isFinite(event.offsetMs)) return context;
        const offsetMs = Math.round(event.offsetMs);
        return {
          ...context,
          projects: context.projects.map((project) =>
            project.id === event.id
              ? { ...project, timingOffsetMs: offsetMs }
              : project,
          ),
        };
      },
      deleteProject: (context, event: { id: string }) => ({
        ...context,
        projects: context.projects.filter((project) => project.id !== event.id),
      }),
      updateSubtitles: (
        context,
        event: { id: string; updater: SubtitleUpdater },
      ) => ({
        ...context,
        projects: context.projects.map((project) => {
          if (project.id !== event.id) return project;
          const next = event.updater(project.subtitles);
          // Skip no-op mutations (the updater returned the same reference).
          return next === project.subtitles
            ? project
            : { ...project, subtitles: next };
        }),
      }),
      setMigrating: (context, event: { isMigrating: boolean }) => ({
        ...context,
        isMigrating: event.isMigrating,
      }),
    },
  }).with(
    persist({
      name: STORAGE_KEYS.projects,
      storage: storage ?? createJSONStorage(() => localStorage),
      pick: (context) => ({ projects: context.projects }),
      // The old useLocalStorage wrote the bare Project[] array, not the
      // `{ context, version }` envelope persist expects — adapt on read so
      // existing data survives the upgrade with no migration.
      deserialize: (str) => {
        const parsed: unknown = JSON.parse(str);
        if (Array.isArray(parsed)) {
          return { context: { projects: parsed as Project[] }, version: 0 };
        }
        return parsed as { context: Partial<ProjectsContext>; version: number };
      },
      merge: (persisted, current) => ({
        ...current,
        projects: parseProjects(persisted.projects),
      }),
    }),
  );
}

/** The app-wide singleton. */
export const projectsStore = createProjectsStore();
