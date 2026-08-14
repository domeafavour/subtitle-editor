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
      className={`group flex items-start gap-3 rounded border px-3 py-2 transition-colors ${
        active
          ? "border-blue-500 bg-blue-500/10"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      {!editingText && (
        <button
          type="button"
          disabled={!videoLoaded}
          onClick={() => playback.seekTo(line.startMs)}
          title={videoLoaded ? "Jump to start" : "Load a video to jump"}
          aria-label="Jump to line start"
          className="shrink-0 self-start pt-1.5 text-xs text-neutral-400 hover:text-neutral-100 disabled:cursor-not-allowed"
        >
          ⟪
        </button>
      )}
      {editingText ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          rows={2}
          onChange={(event) => setEditValue(event.target.value)}
          onKeyDown={handleTextKeyDown}
          onBlur={saveText}
          className="min-w-0 flex-1 resize-none rounded border border-blue-500 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none"
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
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition-colors hover:bg-neutral-800/70 disabled:cursor-not-allowed"
        >
          <span className="w-16 shrink-0 pt-1.5 font-mono text-xs text-neutral-400">
            {formatTimestamp(line.startMs)}
          </span>
          <span className="min-w-0 flex-1 pt-1 text-sm text-neutral-100">
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
        <div className="flex w-24 shrink-0 items-center gap-1 pt-1.5">
          <button
            type="button"
            onClick={startEndEdit}
            title={manual ? "End time (manual)" : "End time (automatic)"}
            className={`flex-1 rounded px-1 py-0.5 font-mono text-xs hover:bg-neutral-800 ${
              manual ? "text-blue-300" : "text-neutral-400"
            }`}
          >
            {manual && <span aria-hidden="true">● </span>}
            {formatTimestamp(line.endMs)}
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

      <div className="flex shrink-0 gap-1 pt-1">
        <button
          type="button"
          onClick={() => speakText(line.text)}
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
          className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-red-950 hover:text-red-300"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
