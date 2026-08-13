import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  clearLegacySubtitles,
  migrateLegacyProject,
  readLegacySubtitles,
} from "#/lib/migration";
import { createProjectRecord } from "#/lib/project";
import { parseProjects, STORAGE_KEYS } from "#/lib/storage";
import type { Project, Subtitle } from "#/lib/types";
import {
  deleteHandle,
  deleteLegacyHandle,
  readLegacyHandle,
  storeHandle,
} from "#/lib/videoHandleStore";

import { useLocalStorage } from "./useLocalStorage";

export interface ProjectsApi {
  /** Newest first (createdAt desc, id tiebreak). */
  projects: Project[];
  /** True while the one-time legacy migration runs. */
  isMigrating: boolean;
  createProject: (input: {
    videoName: string;
    handle?: FileSystemFileHandle;
  }) => Promise<Project>;
  renameProject: (id: string, name: string) => void;
  updateVideoName: (id: string, videoName: string) => void;
  /** Removes the project and its stored video handle. */
  deleteProject: (id: string) => void;
  updateSubtitles: (
    id: string,
    updater: (prev: Subtitle[]) => Subtitle[],
  ) => void;
}

/**
 * The single source of truth for projects. Call exactly once per route; derive
 * everything (including the current project's subtitles) from the returned
 * `projects`. Also runs the one-time legacy migration.
 */
export function useProjects(): ProjectsApi {
  const [projects, setProjects] = useLocalStorage<Project[]>(
    STORAGE_KEYS.projects,
    [],
    parseProjects,
  );
  const [isMigrating, setIsMigrating] = useState(
    () => readLegacySubtitles().length > 0 && projects.length === 0,
  );
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const createProject = useCallback(
    async (input: { videoName: string; handle?: FileSystemFileHandle }) => {
      const project = createProjectRecord({ videoName: input.videoName });
      if (input.handle) await storeHandle(project.id, input.handle);
      setProjects((prev) => [project, ...prev]);
      return project;
    },
    [setProjects],
  );

  const renameProject = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (trimmed.length === 0) return;
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id ? { ...project, name: trimmed } : project,
        ),
      );
    },
    [setProjects],
  );

  const updateVideoName = useCallback(
    (id: string, videoName: string) => {
      if (videoName.length === 0) return;
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id ? { ...project, videoName } : project,
        ),
      );
    },
    [setProjects],
  );

  const deleteProject = useCallback(
    (id: string) => {
      void deleteHandle(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
    },
    [setProjects],
  );

  const updateSubtitles = useCallback(
    (id: string, updater: (prev: Subtitle[]) => Subtitle[]) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== id) return project;
          const next = updater(project.subtitles);
          // Skip no-op mutations (updater returned the same reference).
          return next === project.subtitles
            ? project
            : { ...project, subtitles: next };
        }),
      );
    },
    [setProjects],
  );

  // One-time legacy migration. Idempotent: the commit point is clearing the
  // legacy keys; any crash before that is swept next load.
  useEffect(() => {
    let cancelled = false;
    const legacy = readLegacySubtitles();
    if (legacy.length === 0 || projectsRef.current.length > 0) {
      clearLegacySubtitles();
      void deleteLegacyHandle();
      setIsMigrating(false);
      return;
    }
    void (async () => {
      try {
        const legacyHandle = await readLegacyHandle();
        if (cancelled) return;
        const { project } = migrateLegacyProject(projectsRef.current, {
          subtitles: legacy,
          videoName: legacyHandle?.name ?? null,
        });
        if (project) {
          if (legacyHandle) await storeHandle(project.id, legacyHandle);
          if (cancelled) return;
          setProjects((prev) => [project, ...prev]);
        }
      } finally {
        clearLegacySubtitles();
        void deleteLegacyHandle();
        if (!cancelled) setIsMigrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProjects]);

  const sorted = useMemo(
    () =>
      [...projects].sort(
        (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id),
      ),
    [projects],
  );

  return {
    projects: sorted,
    isMigrating,
    createProject,
    renameProject,
    updateVideoName,
    deleteProject,
    updateSubtitles,
  };
}
