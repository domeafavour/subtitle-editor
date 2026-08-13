import type { DragEvent } from "react";
import { useState } from "react";

interface DropZoneProps {
  onFile: (file: File) => void;
  /** True when subtitles were restored from localStorage — re-pick the video. */
  hasRestoredSubtitles: boolean;
}

/** Drag-and-drop / click surface shown when no video is loaded. */
export function DropZone({ onFile, hasRestoredSubtitles }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragging ? "border-blue-500 bg-blue-500/10" : "border-neutral-600"
      }`}
    >
      <input
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <p className="text-lg font-medium text-neutral-100">
        {hasRestoredSubtitles
          ? "Your subtitles were restored — pick the same video file to continue"
          : "Pick your video to begin"}
      </p>
      <p className="text-sm text-neutral-400">
        Drop a video file here, or click to browse
      </p>
    </label>
  );
}
