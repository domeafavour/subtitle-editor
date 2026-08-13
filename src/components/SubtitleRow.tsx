import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { formatTimestamp } from "#/lib/format";
import type { SubtitleWithEnd } from "#/lib/types";

interface SubtitleRowProps {
  line: SubtitleWithEnd;
  onUpdateText: (id: string, text: string) => void;
  onNudge: (id: string, deltaMs: number) => void;
  onDelete: (id: string) => void;
}

/** One subtitle in the list: start · editable text · computed end, plus nudge/delete. */
export function SubtitleRow({
  line,
  onUpdateText,
  onNudge,
  onDelete,
}: SubtitleRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(line.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const save = () => {
    setEditing(false);
    if (editValue.trim().length > 0) onUpdateText(line.id, editValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
    }
  };

  return (
    <li className="flex items-start gap-3 rounded border border-neutral-800 bg-neutral-900 px-3 py-2">
      <span className="w-16 shrink-0 pt-1.5 font-mono text-xs text-neutral-400">
        {formatTimestamp(line.startMs)}
      </span>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          rows={2}
          onChange={(event) => setEditValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          className="min-w-0 flex-1 resize-none rounded border border-blue-500 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditValue(line.text);
            setEditing(true);
          }}
          className="min-w-0 flex-1 pt-1 text-left text-sm text-neutral-100 hover:underline"
        >
          {line.text}
        </button>
      )}
      <span className="w-16 shrink-0 pt-1.5 font-mono text-xs text-neutral-400">
        {formatTimestamp(line.endMs)}
      </span>
      <div className="flex shrink-0 gap-1 pt-1">
        <button
          type="button"
          onClick={() => onNudge(line.id, -100)}
          title="Move earlier by 0.1s"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          −0.1s
        </button>
        <button
          type="button"
          onClick={() => onNudge(line.id, 100)}
          title="Move later by 0.1s"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          +0.1s
        </button>
        <button
          type="button"
          onClick={() => onDelete(line.id)}
          title="Delete subtitle"
          className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-red-950 hover:text-red-300"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
