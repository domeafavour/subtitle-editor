import { useSelector } from "@xstate/react";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { usePlayback } from "#/hooks/editorContext";
import { useSubtitleActions } from "#/hooks/useProjectData";
import {
  formatEndSeconds,
  formatTimestamp,
  parseSecondsToMs,
} from "#/lib/format";
import { speakText } from "#/lib/speech";
import type { SubtitleWithEnd } from "#/lib/types";
import { settingsStore } from "#/store/settingsStore";
import { speechMeasureStore } from "#/store/speechMeasureStore";

interface SubtitleRowProps {
  /** The line this row renders — the one genuinely per-row value. */
  line: SubtitleWithEnd;
  /** True when this line contains the video's current time. */
  active: boolean;
}

/**
 * One subtitle in the list. The body (start · text) is a button that plays the
 * line's range; the end time is a separate click-to-edit (seconds) with a
 * reset-to-automatic control when overridden. Nudge/delete stay as controls.
 * Playback and store mutations come from context — only `line`/`active` are
 * props.
 */
export function SubtitleRow({ line, active }: SubtitleRowProps) {
  const playback = usePlayback();
  const { updateText, setManualEnd, nudgeStart, remove } = useSubtitleActions();
  const measuring = useSelector(speechMeasureStore, (snapshot) =>
    snapshot.context.measuring.includes(line.id),
  );
  const speechSpeed = useSelector(
    settingsStore,
    (snapshot) => snapshot.context.settings.speechSpeed,
  );
  const videoLoaded = playback.videoUrl != null;
  const [editingText, setEditingText] = useState(false);
  const [editValue, setEditValue] = useState(line.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [editingEnd, setEditingEnd] = useState(false);
  const [endEditValue, setEndEditValue] = useState("");
  const endInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingText) textareaRef.current?.focus();
  }, [editingText]);

  useEffect(() => {
    if (editingEnd) endInputRef.current?.focus();
  }, [editingEnd]);

  const saveText = () => {
    setEditingText(false);
    if (editValue.trim().length > 0) updateText(line.id, editValue);
  };

  const handleTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveText();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditingText(false);
    }
  };

  const startEndEdit = () => {
    // Prefill from the stored override when present, else the effective end.
    setEndEditValue(formatEndSeconds(line.manualEndMs ?? line.endMs));
    setEditingEnd(true);
  };

  const saveEnd = () => {
    const ms = parseSecondsToMs(endEditValue);
    if (ms != null && ms > line.startMs) setManualEnd(line.id, ms);
    setEditingEnd(false);
  };

  const handleEndKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEnd();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditingEnd(false);
    }
  };

  const manual = line.manualEndMs != null;

  return (
    <li
      className={`group flex flex-col items-start gap-x-3 gap-y-2 rounded border px-3 py-2 transition-colors ${
        active
          ? "border-blue-500 bg-blue-500/10"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <div className="flex flex-row gap-3 w-full items-center">
        {editingText ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            rows={2}
            onChange={(event) => setEditValue(event.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={saveText}
            className="min-w-0 grow basis-40 resize-none rounded border border-blue-500 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none"
          />
        ) : (
          <button
            type="button"
            disabled={!videoLoaded}
            onClick={() => playback.playRange(line.startMs, line.endMs)}
            title={
              videoLoaded
                ? `Play ${formatTimestamp(line.startMs)} → ${formatTimestamp(line.endMs)}`
                : "Load a video to play this line"
            }
            className="px-1 flex min-w-0 grow basis-40 items-center gap-3 text-left transition-colors hover:bg-neutral-800/70 disabled:cursor-not-allowed rounded"
          >
            {/* Timestamps are always 12 chars (HH:MM:SS.mmm); size the box to the
              text so it never spills over the subtitle (a fixed w-16 clipped
              it). Content-sized keeps rows aligned — identical strings. */}
            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-neutral-400">
              {formatTimestamp(line.startMs)}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre-line wrap-break-word text-sm text-neutral-100">
              {line.text}
            </span>
          </button>
        )}

        {editingEnd ? (
          <input
            ref={endInputRef}
            type="text"
            inputMode="decimal"
            value={endEditValue}
            onChange={(event) => setEndEditValue(event.target.value)}
            onKeyDown={handleEndKeyDown}
            onBlur={saveEnd}
            aria-label="End time in seconds"
            className="w-24 shrink-0 rounded border border-blue-500 bg-neutral-800 px-2 py-1 font-mono text-xs text-neutral-100 outline-none"
          />
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={startEndEdit}
              title={
                measuring
                  ? "Measuring speech duration…"
                  : manual
                    ? "End time (manual)"
                    : "End time (automatic)"
              }
              className={`rounded px-1 py-0.5 items-center font-mono text-xs whitespace-nowrap hover:bg-neutral-800 ${
                manual ? "text-blue-300" : "text-neutral-400"
              }`}
            >
              {measuring ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent"
                  />
                </span>
              ) : (
                <>
                  {manual && <span aria-hidden="true">● </span>}
                  {formatTimestamp(line.endMs)}
                </>
              )}
            </button>
            {manual && (
              <button
                type="button"
                onClick={() => setManualEnd(line.id, null)}
                title="Reset to automatic end"
                className="rounded px-1 py-0.5 text-xs text-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
              >
                ⟳
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex w-full flex-wrap shrink-0 gap-1 pt-1">
        {!editingText && (
          <button
            type="button"
            disabled={!videoLoaded}
            onClick={() => playback.seekTo(line.startMs)}
            title={videoLoaded ? "Jump to start" : "Load a video to jump"}
            aria-label="Jump to line start"
            className="rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-not-allowed"
          >
            ⟪
          </button>
        )}
        <button
          type="button"
          onClick={() => speakText(line.text, speechSpeed)}
          title="Read line aloud"
          aria-label="Read line aloud"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
        >
          🔊
        </button>
        {!editingText && !editingEnd && (
          <button
            type="button"
            onClick={() => {
              setEditValue(line.text);
              setEditingText(true);
            }}
            title="Edit text"
            className="rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            ✎
          </button>
        )}
        <button
          type="button"
          disabled={!videoLoaded}
          onClick={() => playback.seekTo(line.endMs)}
          title={videoLoaded ? "Jump to end" : "Load a video to jump"}
          aria-label="Jump to line end"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-not-allowed"
        >
          ⟫
        </button>
        <button
          type="button"
          onClick={() => nudgeStart(line.id, -100)}
          title="Move earlier by 0.1s"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          −0.1s
        </button>
        <button
          type="button"
          onClick={() => nudgeStart(line.id, 100)}
          title="Move later by 0.1s"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          +0.1s
        </button>
        <button
          type="button"
          onClick={() => remove(line.id)}
          title="Delete subtitle"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-red-950 hover:text-red-300 ms-auto"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
