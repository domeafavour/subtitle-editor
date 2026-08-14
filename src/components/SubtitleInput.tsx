import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";

import { usePlayback } from "#/hooks/editorContext";
import { useProject } from "#/hooks/useProjectData";
import { formatTimestamp } from "#/lib/format";

/**
 * Draft composer shown while a draft is open (paused or via + Add line).
 * Enter commits (Shift+Enter inserts a newline), ESC cancels. Reads the draft
 * from the playback machine context — no props; renders nothing without one.
 */
export function SubtitleInput() {
  const playback = usePlayback();
  const project = useProject();
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const draft = playback.draft;
  // The composer shows the shifted capture time, matching the row display.
  const offsetMs = project?.timingOffsetMs ?? 0;

  useEffect(() => {
    if (draft) ref.current?.focus();
  }, [draft]);

  if (!draft) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      playback.commitDraft(ref.current?.value ?? "");
    } else if (event.key === "Escape") {
      event.preventDefault();
      playback.cancelDraft();
    }
  };

  return (
    // Fixed overlay, bottom-center of the viewport: opening/canceling the
    // draft never shifts the page layout. Deliberately not dismissible by
    // outside click — typed text lives only in this textarea and an
    // accidental click would silently lose it; Enter/Esc are the only exits.
    <div className="animate-composer-in fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-xl">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="font-mono text-xs text-neutral-400">
            New line at {formatTimestamp(draft.startMs + offsetMs)}
          </div>
          <button
            type="button"
            onClick={playback.cancelDraft}
            title="Cancel (Esc)"
            aria-label="Cancel subtitle"
            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>
        <textarea
          ref={ref}
          rows={2}
          placeholder="Type the subtitle…"
          onKeyDown={handleKeyDown}
          className="w-full resize-none rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-500"
        />
        <div className="mt-1 text-xs text-neutral-500">
          Enter to commit · Shift+Enter for a new line · Esc or ✕ to cancel
        </div>
      </div>
    </div>
  );
}
