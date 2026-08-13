import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isMeaningful, sanitizeText } from "#/lib/text";
import type { Draft } from "#/lib/types";

export interface PlaybackApi {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  videoName: string | null;
  isPlaying: boolean;
  draft: Draft | null;
  loadVideo: (file: File) => void;
  togglePlayPause: () => void;
  commitDraft: (text: string) => void;
  cancelDraft: () => void;
  /** Attach to the `<video>` element's onPlay. */
  handleVideoPlay: () => void;
  /** Attach to the `<video>` element's onPause. */
  handleVideoPause: () => void;
}

interface UsePlaybackOptions {
  /** From useSubtitles — used to persist a committed line. */
  add: (startMs: number, text: string) => void;
}

/**
 * Owns the `<video>` element lifecycle and the draft flow.
 *
 * A draft is created whenever the video is paused (start = pause timecode) and
 * discarded when it plays. The latest `draft`/`add` are mirrored into refs so
 * the handlers stay referentially stable and never read stale closures.
 */
export function usePlayback({ add }: UsePlaybackOptions): PlaybackApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;
  const addRef = useRef(add);
  addRef.current = add;
  const videoUrlRef = useRef<string | null>(null);
  videoUrlRef.current = videoUrl;

  const loadVideo = useCallback((file: File) => {
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setVideoName(file.name);
    setDraft(null);
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  const commitDraft = useCallback((text: string) => {
    const current = draftRef.current;
    if (!current) return;
    const clean = sanitizeText(text);
    if (!isMeaningful(clean)) return;
    addRef.current(current.startMs, clean);
    setDraft(null);
  }, []);

  const cancelDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
    setDraft(null);
  }, []);

  const handleVideoPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setIsPlaying(false);
    // Skip a draft on natural end, and never overwrite an open draft.
    if (!video.ended && draftRef.current == null) {
      setDraft({ startMs: Math.round(video.currentTime * 1000) });
    }
  }, []);

  // Revoke the object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  return {
    videoRef,
    videoUrl,
    videoName,
    isPlaying,
    draft,
    loadVideo,
    togglePlayPause,
    commitDraft,
    cancelDraft,
    handleVideoPlay,
    handleVideoPause,
  };
}
