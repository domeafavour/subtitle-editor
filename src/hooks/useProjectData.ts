import { useSelector } from "@xstate/react";
import { useCallback, useMemo } from "react";
import { measureSpeechDuration } from "#/lib/speechDuration";
import {
  nudgeSubtitleStart,
  removeSubtitle,
  setSpeechDurationMs,
  setSubtitleManualEnd,
  updateSubtitleText,
} from "#/lib/subtitles";
import { sortedWithEnds } from "#/lib/timing";
import type { Project, SubtitleWithEnd } from "#/lib/types";
import { projectsStore } from "#/store/projectsStore";
import { settingsStore } from "#/store/settingsStore";

import { useProjectId } from "./editorContext";

/**
 * Store-backed reads for the project editor. Components pull project data and
 * mutation actions from the global stores instead of receiving props, so only
 * genuinely per-instance data is ever passed down.
 */

/** The current project from `projectsStore`, or null while loading/deleted. */
export function useProject(): Project | null {
  const projectId = useProjectId();
  const projects = useSelector(
    projectsStore,
    (snapshot) => snapshot.context.projects,
  );
  return projects.find((item) => item.id === projectId) ?? null;
}

/**
 * The current project's subtitles, chronologically sorted with derived end
 * times attached. Memoized on the project and reading-speed settings so the
 * array (and the line objects inside) stay referentially stable across renders
 * — required by `useActiveLine` and the Timeline/Overlay rAF loops.
 */
export function useLines(): SubtitleWithEnd[] {
  const project = useProject();
  const settings = useSelector(
    settingsStore,
    (snapshot) => snapshot.context.settings,
  );
  return useMemo(
    () => sortedWithEnds(project?.subtitles ?? [], settings),
    [project, settings],
  );
}

/**
 * Stable per-line mutation callbacks, wired straight into `projectsStore`.
 * Recreated only when the project id changes.
 */
export function useSubtitleActions() {
  const projectId = useProjectId();
  const endMode = useSelector(
    settingsStore,
    (snapshot) => snapshot.context.settings.endMode,
  );
  const updateText = useCallback(
    (id: string, text: string) => {
      projectsStore.trigger.updateSubtitles({
        id: projectId,
        updater: (prev) => updateSubtitleText(prev, id, text),
      });
      // Speech mode: re-measure the edited text's spoken duration.
      if (endMode === "speech") {
        void measureSpeechDuration(text).then((ms) => {
          if (ms == null) return;
          projectsStore.trigger.updateSubtitles({
            id: projectId,
            updater: (prev) => setSpeechDurationMs(prev, id, ms),
          });
        });
      }
    },
    [endMode, projectId],
  );
  const setManualEnd = useCallback(
    (id: string, endMs: number | null) => {
      projectsStore.trigger.updateSubtitles({
        id: projectId,
        updater: (prev) => setSubtitleManualEnd(prev, id, endMs),
      });
    },
    [projectId],
  );
  const nudgeStart = useCallback(
    (id: string, deltaMs: number) => {
      projectsStore.trigger.updateSubtitles({
        id: projectId,
        updater: (prev) => nudgeSubtitleStart(prev, id, deltaMs),
      });
    },
    [projectId],
  );
  const remove = useCallback(
    (id: string) => {
      projectsStore.trigger.updateSubtitles({
        id: projectId,
        updater: (prev) => removeSubtitle(prev, id),
      });
    },
    [projectId],
  );
  return { updateText, setManualEnd, nudgeStart, remove };
}
