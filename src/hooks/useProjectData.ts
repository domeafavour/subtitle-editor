import { useSelector } from "@xstate/react";
import { useCallback, useMemo, useRef } from "react";
import { measureSpeechDuration } from "#/lib/speechDuration";
import {
  nudgeSubtitleStart,
  removeSubtitle,
  setSpeechDurationMs,
  setSubtitleManualEnd,
  updateSubtitleText,
} from "#/lib/subtitles";
import { sortedWithEnds } from "#/lib/timing";
import type { Project, Subtitle, SubtitleWithEnd } from "#/lib/types";
import { projectsStore } from "#/store/projectsStore";
import { settingsStore } from "#/store/settingsStore";
import { speechMeasureStore } from "#/store/speechMeasureStore";

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
 * times attached and the project's timing offset applied. Line objects are
 * cached by id and reused across recomputes: only the edited line (and any
 * whose derived end shifted) get fresh identities per mutation, so unchanged
 * rows keep their `line` prop reference — required by `useActiveLine`, the
 * Timeline/Overlay rAF loops, and `SubtitleRow`'s memo.
 */
export function useLines(): SubtitleWithEnd[] {
  const project = useProject();
  const settings = useSelector(
    settingsStore,
    (snapshot) => snapshot.context.settings,
  );
  const cacheRef = useRef(
    new Map<string, { line: SubtitleWithEnd; raw: Subtitle }>(),
  );

  return useMemo(() => {
    const raw = project?.subtitles ?? [];
    const offset = project?.timingOffsetMs ?? 0;
    const computed = sortedWithEnds(raw, settings, offset);
    const rawById = new Map(raw.map((sub) => [sub.id, sub]));
    const cache = cacheRef.current;
    // Drop cache entries for lines that no longer exist.
    for (const id of cache.keys()) {
      if (!rawById.has(id)) cache.delete(id);
    }
    return computed.map((line) => {
      const entry = cache.get(line.id);
      const rawSub = rawById.get(line.id);
      // Mutators only replace the subtitle they touch, so unchanged lines keep
      // their stored reference — reuse the cached object when the raw subtitle
      // and the derived end are both unchanged (a neighbor's clamp, settings,
      // or offset change always shows up in `endMs`).
      if (
        entry != null &&
        rawSub != null &&
        entry.raw === rawSub &&
        entry.line.endMs === line.endMs
      ) {
        return entry.line;
      }
      cache.set(line.id, { line, raw: rawSub ?? line });
      return line;
    });
  }, [project, settings]);
}

/**
 * The current project's timing offset, subscribed granularly (a number, not
 * the whole projects array) so rows don't re-render on every project mutation.
 */
export function useTimingOffset(): number {
  const projectId = useProjectId();
  return useSelector(
    projectsStore,
    (snapshot) =>
      snapshot.context.projects.find((item) => item.id === projectId)
        ?.timingOffsetMs ?? 0,
  );
}

/**
 * Stable per-line mutation callbacks, wired straight into `projectsStore`.
 * Recreated only when the project id, timing offset, or speech settings change.
 */
export function useSubtitleActions() {
  const projectId = useProjectId();
  const timingOffsetMs = useTimingOffset();
  const speechSettings = useSelector(settingsStore, (snapshot) => ({
    endMode: snapshot.context.settings.endMode,
    speechSpeed: snapshot.context.settings.speechSpeed,
  }));
  const updateText = useCallback(
    (id: string, text: string) => {
      projectsStore.trigger.updateSubtitles({
        id: projectId,
        updater: (prev) => updateSubtitleText(prev, id, text),
      });
      // Speech mode: re-measure the edited text's spoken duration. The line
      // shows a measuring spinner until the promise settles.
      if (speechSettings.endMode === "speech") {
        speechMeasureStore.trigger.start({ id });
        void measureSpeechDuration(text, speechSettings.speechSpeed)
          .finally(() => speechMeasureStore.trigger.end({ id }))
          .then((ms) => {
            if (ms == null) return;
            projectsStore.trigger.updateSubtitles({
              id: projectId,
              updater: (prev) => setSpeechDurationMs(prev, id, ms),
            });
          });
      }
    },
    [projectId, speechSettings],
  );
  const setManualEnd = useCallback(
    (id: string, endMs: number | null) => {
      // The editor shows shifted times; store the raw value by unshifting so
      // validation and later rendering stay consistent with the capture time.
      projectsStore.trigger.updateSubtitles({
        id: projectId,
        updater: (prev) =>
          setSubtitleManualEnd(
            prev,
            id,
            endMs == null ? null : endMs - timingOffsetMs,
          ),
      });
    },
    [projectId, timingOffsetMs],
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
