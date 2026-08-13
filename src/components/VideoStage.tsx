import type { RefObject } from "react";
import { useCallback } from "react";

import type { SubtitleWithEnd } from "#/lib/types";

import { DropZone } from "./DropZone";
import { PlaybackOverlay } from "./PlaybackOverlay";

interface VideoStageProps {
  videoUrl: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFile: (file: File) => void;
  hasRestoredSubtitles: boolean;
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
  hasRestoredSubtitles,
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
      ) : (
        <DropZone onFile={onFile} hasRestoredSubtitles={hasRestoredSubtitles} />
      )}
    </div>
  );
}
