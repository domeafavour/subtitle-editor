import type { RefObject } from "react";
import { useCallback } from "react";

import type { SubtitleWithEnd } from "#/lib/types";

import { DropZone } from "./DropZone";
import { PlaybackOverlay } from "./PlaybackOverlay";

interface VideoStageProps {
  videoUrl: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFile: (file: File) => void;
  onFileHandle: (handle: FileSystemFileHandle) => void;
  /** True while re-opening the previously picked video after a reload. */
  restoringVideo: boolean;
  /** A stored handle awaiting a permission re-grant. */
  videoReconnect: { name: string; handle: FileSystemFileHandle } | null;
  onReconnectVideo: () => void;
  onCancelReconnect: () => void;
  /** Labels for the embedded DropZone when no video is loaded. */
  dropZoneTitle?: string;
  dropZoneSubtitle?: string;
  lines: SubtitleWithEnd[];
  isPlaying: boolean;
  onVideoPlay: () => void;
  onVideoPause: () => void;
}

/** 16:9 stage: the drop zone when no video is loaded, otherwise video + overlay. */
export function VideoStage({
  videoUrl,
  videoRef,
  onFile,
  onFileHandle,
  restoringVideo,
  videoReconnect,
  onReconnectVideo,
  onCancelReconnect,
  dropZoneTitle,
  dropZoneSubtitle,
  lines,
  isPlaying,
  onVideoPlay,
  onVideoPause,
}: VideoStageProps) {
  // Blur on mount so the <video> never holds focus — otherwise the browser's
  // native Space toggle would double with our global handler.
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el) el.blur();
    },
    [videoRef],
  );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {videoUrl ? (
        <>
          {/* biome-ignore lint/a11y/useMediaCaption: captions render via PlaybackOverlay from the editor's live timing data, not a native <track>. */}
          <video
            ref={attachVideo}
            src={videoUrl}
            controls
            playsInline
            onPlay={onVideoPlay}
            onPause={onVideoPause}
            className="h-full w-full object-contain"
          />
          <PlaybackOverlay
            videoRef={videoRef}
            lines={lines}
            isPlaying={isPlaying}
          />
        </>
      ) : restoringVideo ? (
        <div className="flex h-full items-center justify-center text-neutral-400">
          Restoring video…
        </div>
      ) : videoReconnect ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg font-medium text-neutral-100">
            Reconnect to your video
          </p>
          <p className="text-sm text-neutral-400">{videoReconnect.name}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReconnectVideo}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Reconnect
            </button>
            <button
              type="button"
              onClick={onCancelReconnect}
              className="rounded bg-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700"
            >
              Choose a different video
            </button>
          </div>
        </div>
      ) : (
        <DropZone
          onFile={onFile}
          onFileHandle={onFileHandle}
          title={dropZoneTitle ?? "Load the video for this project"}
          subtitle={
            dropZoneSubtitle ?? "Drop a video file here, or click to browse"
          }
        />
      )}
    </div>
  );
}
