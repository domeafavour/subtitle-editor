import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";

import { usePlayback } from "#/hooks/editorContext";
import { formatTimestamp } from "#/lib/format";

/**
 * Draft composer shown while a draft is open (paused or via + Add line).
 * Enter commits (Shift+Enter inserts a newline), ESC cancels. Reads the draft
 * from the playback machine context — no props; renders nothing without one.
 */
export function SubtitleInput() {
  const playback = usePlayback();
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const draft = playback.draft;

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
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
      <div className="mb-1 font-mono text-xs text-neutral-400">
        New line at {formatTimestamp(draft.startMs)}
      </div>
      <textarea
        ref={ref}
        rows={2}
        placeholder="Type the subtitle…"
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-500"
      />
      <div className="mt-1 text-xs text-neutral-500">
        Enter to commit · Shift+Enter for a new line · Esc to cancel
      </div>
    </div>
  );
}
