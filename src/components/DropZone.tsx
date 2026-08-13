import type { DragEvent } from "react";
import { useRef, useState } from "react";

interface DropZoneProps {
  /** Drop / fallback-picker path — video plays for this session only. */
  onFile: (file: File) => void;
  /** File System Access API path — also persists the file handle for reloads. */
  onFileHandle: (handle: FileSystemFileHandle) => void;
  /** True when subtitles were restored from localStorage — pick the video. */
  hasRestoredSubtitles: boolean;
}

const VIDEO_ACCEPT: FilePickerAcceptType[] = [
  {
    description: "Videos",
    accept: {
      "video/*": [
        ".mp4",
        ".webm",
        ".mov",
        ".mkv",
        ".avi",
        ".m4v",
        ".ogv",
        ".mpeg",
        ".mpg",
      ],
    },
  },
];

/**
 * Drag-and-drop / click surface shown when no video is loaded. Clicking
 * browses via the File System Access API when available (persists the handle);
 * otherwise it falls back to a plain file input.
 */
export function DropZone({
  onFile,
  onFileHandle,
  hasRestoredSubtitles,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const pickFile = (file: File | undefined) => {
    if (file) onFile(file);
  };

  const browse = () => {
    if ("showOpenFilePicker" in window) {
      void (async () => {
        try {
          const [handle] = await window.showOpenFilePicker({
            types: VIDEO_ACCEPT,
            multiple: false,
          });
          onFileHandle(handle);
        } catch {
          // User cancelled the picker.
        }
      })();
      return;
    }
    inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="h-full">
      <button
        type="button"
        onClick={browse}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-blue-500 bg-blue-500/10" : "border-neutral-600"
        }`}
      >
        <p className="text-lg font-medium text-neutral-100">
          {hasRestoredSubtitles
            ? "Your subtitles were restored — pick the same video file to continue"
            : "Pick your video to begin"}
        </p>
        <p className="text-sm text-neutral-400">
          Drop a video file here, or click to browse
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
