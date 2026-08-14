import type { DragEvent } from "react";
import { useRef, useState } from "react";

interface DropZoneProps {
  /** Drop / fallback-picker path — video plays for this session only. */
  onFile: (file: File) => void;
  /** File System Access API path — also persists the file handle for reloads. */
  onFileHandle: (handle: FileSystemFileHandle) => void;
  /** Main call-to-action, e.g. "Create a project from a video". */
  title: string;
  /** Secondary hint, e.g. "Drop a video file here, or click to browse". */
  subtitle: string;
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
 *
 * Drops are handle-backed: the dropped file's `FileSystemFileHandle` is
 * retrieved via `DataTransferItem.getAsFileSystemHandle()`, so a dragged
 * video persists and restores after a reload like a picked one. When no
 * handle can be obtained (browser without the API, or a file that can't
 * expose one), the drop falls back to a session-only `File` — usable until
 * the page reloads, matching the picker fallback.
 */
export function DropZone({
  onFile,
  onFileHandle,
  title,
  subtitle,
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
    void (async () => {
      const handle = await firstFileHandle(event.dataTransfer);
      if (handle) {
        onFileHandle(handle); // persists → restorable after reload
      } else {
        // No handle obtainable (browser without the API, or a file that
        // can't expose one): fall back to a session-only File.
        pickFile(event.dataTransfer.files[0]);
      }
    })();
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
        <p className="text-lg font-medium text-neutral-100">{title}</p>
        <p className="text-sm text-neutral-400">{subtitle}</p>
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

/** The first file handle in a drop, or null when none can be obtained. */
async function firstFileHandle(
  dataTransfer: DataTransfer,
): Promise<FileSystemFileHandle | null> {
  for (const item of dataTransfer.items) {
    if (item.kind !== "file") continue;
    try {
      const handle = await item.getAsFileSystemHandle();
      if (handle && handle.kind === "file") return handle;
    } catch {
      // The browser couldn't expose the handle — treat as no drop.
    }
  }
  return null;
}
