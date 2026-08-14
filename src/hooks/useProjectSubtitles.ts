import { useCallback } from "react";

import {
  addSubtitle,
  nudgeSubtitleStart,
  removeSubtitle,
  setSubtitleManualEnd,
  updateSubtitleText,
} from "#/lib/subtitles";
import type { Project, Subtitle } from "#/lib/types";

import type { ProjectsApi } from "./useProjects";

export interface SubtitlesApi {
  subtitles: Subtitle[];
  add: (startMs: number, text: string) => void;
  updateText: (id: string, text: string) => void;
  setManualEnd: (id: string, endMs: number | null) => void;
  nudgeStart: (id: string, deltaMs: number) => void;
  remove: (id: string) => void;
}

interface UseProjectSubtitlesArgs {
  projects: Project[];
  updateSubtitles: ProjectsApi["updateSubtitles"];
  projectId: string;
}

/**
 * Per-project subtitle ops, derived from the single `useProjects()` instance
 * (this hook does not call it itself — the route calls it once). Keeps the
 * row component's existing `SubtitlesApi` surface so SubtitleRow is untouched.
 */
export function useProjectSubtitles({
  projects,
  updateSubtitles,
  projectId,
}: UseProjectSubtitlesArgs): SubtitlesApi {
  const subtitles =
    projects.find((project) => project.id === projectId)?.subtitles ?? [];

  const add = useCallback(
    (startMs: number, text: string) => {
      updateSubtitles(projectId, (prev) => addSubtitle(prev, startMs, text));
    },
    [projectId, updateSubtitles],
  );

  const updateText = useCallback(
    (id: string, text: string) => {
      updateSubtitles(projectId, (prev) => updateSubtitleText(prev, id, text));
    },
    [projectId, updateSubtitles],
  );

  const setManualEnd = useCallback(
    (id: string, endMs: number | null) => {
      updateSubtitles(projectId, (prev) =>
        setSubtitleManualEnd(prev, id, endMs),
      );
    },
    [projectId, updateSubtitles],
  );

  const nudgeStart = useCallback(
    (id: string, deltaMs: number) => {
      updateSubtitles(projectId, (prev) =>
        nudgeSubtitleStart(prev, id, deltaMs),
      );
    },
    [projectId, updateSubtitles],
  );

  const remove = useCallback(
    (id: string) => {
      updateSubtitles(projectId, (prev) => removeSubtitle(prev, id));
    },
    [projectId, updateSubtitles],
  );

  return {
    subtitles,
    add,
    updateText,
    setManualEnd,
    nudgeStart,
    remove,
  };
}
