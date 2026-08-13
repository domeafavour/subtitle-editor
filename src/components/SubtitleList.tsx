import type { SubtitleWithEnd } from "#/lib/types";

import { SubtitleRow } from "./SubtitleRow";

interface SubtitleListProps {
  lines: SubtitleWithEnd[];
  onUpdateText: (id: string, text: string) => void;
  onNudge: (id: string, deltaMs: number) => void;
  onDelete: (id: string) => void;
}

/** Chronological subtitle list — the review/edit surface. */
export function SubtitleList({
  lines,
  onUpdateText,
  onNudge,
  onDelete,
}: SubtitleListProps) {
  if (lines.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        No subtitles yet — pause the video and type the first line.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {lines.map((line) => (
        <SubtitleRow
          key={line.id}
          line={line}
          onUpdateText={onUpdateText}
          onNudge={onNudge}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
