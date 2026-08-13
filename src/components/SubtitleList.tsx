import type { SubtitleWithEnd } from "#/lib/types";

import { SubtitleRow } from "./SubtitleRow";

interface SubtitleListProps {
  lines: SubtitleWithEnd[];
  videoLoaded: boolean;
  onPlayRange: (startMs: number, endMs: number) => void;
  onJumpTo: (ms: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onSetManualEnd: (id: string, endMs: number | null) => void;
  onNudge: (id: string, deltaMs: number) => void;
  onDelete: (id: string) => void;
}

/** Chronological subtitle list — the review/edit surface. */
export function SubtitleList({
  lines,
  videoLoaded,
  onPlayRange,
  onJumpTo,
  onUpdateText,
  onSetManualEnd,
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
          videoLoaded={videoLoaded}
          onPlayRange={onPlayRange}
          onJumpTo={onJumpTo}
          onUpdateText={onUpdateText}
          onSetManualEnd={onSetManualEnd}
          onNudge={onNudge}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
