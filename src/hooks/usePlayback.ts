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
  /** Seek to `startMs` and play, pausing automatically when `endMs` is reached. */
  playRange: (startMs: number, endMs: number) => void;
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
  const [activeRange, setActiveRange] = useState<{
    startMs: number;
    endMs: number;
  } | null>(null);

  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;
  // Set just before a range-triggered pause so that pause does not open a draft.
  const suppressDraftRef = useRef(false);
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

  const playRange = useCallback((startMs: number, endMs: number) => {
    const video = videoRef.current;
    if (!video || endMs <= startMs) return;
    setActiveRange({ startMs, endMs });
    video.currentTime = startMs / 1000;
    void video.play();
  }, []);

  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
    setDraft(null);
  }, []);

  const handleVideoPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setIsPlaying(false);
    // Any pause ends an active range.
    setActiveRange(null);
    const suppressDraft = suppressDraftRef.current;
    suppressDraftRef.current = false;
    // Skip a draft on natural end, after a range preview, and never overwrite
    // an open draft.
    if (!video.ended && !suppressDraft && draftRef.current == null) {
      setDraft({ startMs: Math.round(video.currentTime * 1000) });
    }
  }, []);

  // Watch the active range while playing and pause exactly at its end.
  useEffect(() => {
    if (!isPlaying || !activeRange) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && video.currentTime * 1000 >= activeRange.endMs) {
        suppressDraftRef.current = true;
        setActiveRange(null);
        video.pause();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, activeRange]);

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
    playRange,
    commitDraft,
    cancelDraft,
    handleVideoPlay,
    handleVideoPause,
  };
}
