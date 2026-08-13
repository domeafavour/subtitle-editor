import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";

import { formatTimestamp } from "#/lib/format";

interface SubtitleInputProps {
  draftStartMs: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

/**
 * Draft composer shown while the video is paused. Enter commits (Shift+Enter
 * inserts a newline), ESC cancels. Auto-focuses on mount.
 */
export function SubtitleInput({
  draftStartMs,
  onCommit,
  onCancel,
}: SubtitleInputProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onCommit(ref.current?.value ?? "");
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
      <div className="mb-1 font-mono text-xs text-neutral-400">
        New line at {formatTimestamp(draftStartMs)}
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
