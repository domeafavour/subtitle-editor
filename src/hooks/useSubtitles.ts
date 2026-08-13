import { useCallback } from "react";

import { parseSubtitles, STORAGE_KEYS } from "#/lib/storage";
import { isMeaningful, sanitizeText } from "#/lib/text";
import type { Subtitle } from "#/lib/types";

import { useLocalStorage } from "./useLocalStorage";

export interface SubtitlesApi {
  /** Raw list, stored in insertion order — display order is derived. */
  subtitles: Subtitle[];
  add: (startMs: number, text: string) => void;
  updateText: (id: string, text: string) => void;
  /** Set a manual end override (ms) or clear it (null → automatic). */
  setManualEnd: (id: string, endMs: number | null) => void;
  nudgeStart: (id: string, deltaMs: number) => void;
  remove: (id: string) => void;
}

/**
 * Subtitle collection, persisted. All mutations are immutable one-line updates
 * that keep `startMs` a non-negative integer and reject empty text.
 */
export function useSubtitles(): SubtitlesApi {
  const [subtitles, setSubtitles] = useLocalStorage<Subtitle[]>(
    STORAGE_KEYS.subtitles,
    [],
    parseSubtitles,
  );

  const add = useCallback(
    (startMs: number, text: string) => {
      const clean = sanitizeText(text);
      if (!isMeaningful(clean)) return;
      setSubtitles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          startMs: Math.max(0, Math.round(startMs)),
          text: clean,
        },
      ]);
    },
    [setSubtitles],
  );

  const updateText = useCallback(
    (id: string, text: string) => {
      const clean = sanitizeText(text);
      if (!isMeaningful(clean)) return;
      setSubtitles((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, text: clean } : sub)),
      );
    },
    [setSubtitles],
  );

  const setManualEnd = useCallback(
    (id: string, endMs: number | null) => {
      setSubtitles((prev) =>
        prev.map((sub) => {
          if (sub.id !== id) return sub;
          if (endMs == null) {
            const { manualEndMs, ...rest } = sub;
            return rest;
          }
          if (!Number.isFinite(endMs) || Math.round(endMs) <= sub.startMs) {
            return sub;
          }
          return { ...sub, manualEndMs: Math.round(endMs) };
        }),
      );
    },
    [setSubtitles],
  );

  const nudgeStart = useCallback(
    (id: string, deltaMs: number) => {
      setSubtitles((prev) =>
        prev.map((sub) => {
          if (sub.id !== id) return sub;
          const startMs = Math.max(0, sub.startMs + deltaMs);
          // A start moved past the override would violate `manualEndMs > startMs`
          // (and be dropped on reload) — clear the override instead.
          if (sub.manualEndMs != null && startMs >= sub.manualEndMs) {
            const { manualEndMs, ...rest } = sub;
            return { ...rest, startMs };
          }
          return { ...sub, startMs };
        }),
      );
    },
    [setSubtitles],
  );

  const remove = useCallback(
    (id: string) => {
      setSubtitles((prev) => prev.filter((sub) => sub.id !== id));
    },
    [setSubtitles],
  );

  return { subtitles, add, updateText, setManualEnd, nudgeStart, remove };
}
