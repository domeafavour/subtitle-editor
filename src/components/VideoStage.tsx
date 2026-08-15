import { useCallback } from "react";

import { usePlayback } from "#/hooks/editorContext";

import { DropZone } from "./DropZone";
import { PlaybackOverlay } from "./PlaybackOverlay";

/**
 * 16:9 stage: the drop zone when no video is loaded, otherwise video + overlay.
 * Reads video state from the playback machine context — no props.
 */
export function VideoStage() {
  const playback = usePlayback();
  // Blur on mount so the <video> never holds focus — otherwise the browser's
  // native Space toggle would double with our global handler.
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      playback.videoRef.current = el;
      if (el) el.blur();
    },
    [playback.videoRef],
  );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {playback.videoUrl ? (
        <>
          {/* biome-ignore lint/a11y/useMediaCaption: captions render via PlaybackOverlay from the editor's live timing data, not a native <track>. */}
          <video
            ref={attachVideo}
            src={playback.videoUrl}
            controls
            playsInline
            onLoadedMetadata={playback.handleVideoMetadata}
            onPlay={playback.handleVideoPlay}
            onPause={playback.handleVideoPause}
            onSeeked={playback.handleVideoSeeked}
            className="h-full w-full object-contain"
          />
          <PlaybackOverlay />
        </>
      ) : playback.restoringVideo ? (
        <div className="flex h-full items-center justify-center text-neutral-400">
          Restoring video…
        </div>
      ) : playback.videoReconnect ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg font-medium text-neutral-100">
            Reconnect to your video
          </p>
          <p className="text-sm text-neutral-400">
            {playback.videoReconnect.name}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={playback.reconnectVideo}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Reconnect
            </button>
            <button
              type="button"
              onClick={playback.cancelReconnect}
              className="rounded bg-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700"
            >
              Choose a different video
            </button>
          </div>
        </div>
      ) : (
        <DropZone
          onFile={playback.loadVideo}
          onFileHandle={playback.loadVideoHandle}
          title="Load the video for this project"
          subtitle="Drop a video file here, or click to browse"
        />
      )}
    </div>
  );
}
