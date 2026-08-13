import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isMeaningful, sanitizeText } from "#/lib/text";
import type { Draft } from "#/lib/types";
import { readStoredHandle, storeHandle } from "#/lib/videoHandleStore";

export interface PlaybackApi {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  videoName: string | null;
  isPlaying: boolean;
  draft: Draft | null;
  loadVideo: (file: File) => void;
  /** Load a video picked via the File System Access API and persist its handle. */
  loadVideoHandle: (handle: FileSystemFileHandle) => void;
  /** True while re-opening the previously picked video after a reload. */
  restoringVideo: boolean;
  /**
   * A stored video handle that needs a permission re-grant (a user gesture)
   * before it can be reopened after a reload.
   */
  videoReconnect: { name: string; handle: FileSystemFileHandle } | null;
  /** Re-grant access to the stored handle — must be called from a click. */
  reconnectVideo: () => void;
  /** Dismiss the reconnect prompt and fall back to the picker. */
  cancelReconnect: () => void;
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
  /** Persists a committed line into the project's subtitles. */
  add: (startMs: number, text: string) => void;
  /** The project whose video handle this playback session belongs to. */
  projectId: string;
}

/**
 * Owns the `<video>` element lifecycle and the draft flow.
 *
 * A draft is created whenever the video is paused (start = pause timecode) and
 * discarded when it plays. The latest `draft`/`add` are mirrored into refs so
 * the handlers stay referentially stable and never read stale closures. The
 * video handle is stored/read keyed by `projectId`.
 */
export function usePlayback({
  add,
  projectId,
}: UsePlaybackOptions): PlaybackApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeRange, setActiveRange] = useState<{
    startMs: number;
    endMs: number;
  } | null>(null);
  const [restoringVideo, setRestoringVideo] = useState(false);
  const [videoReconnect, setVideoReconnect] = useState<{
    name: string;
    handle: FileSystemFileHandle;
  } | null>(null);

  const draftRef = useRef<Draft | null>(null);
  const videoReconnectRef = useRef(videoReconnect);
  videoReconnectRef.current = videoReconnect;
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

  const loadVideoHandle = useCallback(
    (handle: FileSystemFileHandle) => {
      void (async () => {
        try {
          const file = await handle.getFile();
          setVideoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
          });
          setVideoName(file.name);
          setDraft(null);
          void storeHandle(projectId, handle);
        } catch {
          // The file is no longer accessible — nothing to load.
        }
      })();
    },
    [projectId],
  );

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

  // Re-open the previously picked video after a reload. A handle restored from
  // IndexedDB does not keep its permission, so when the state is "prompt" we
  // surface a reconnect action instead of failing silently.
  useEffect(() => {
    let cancelled = false;
    setRestoringVideo(true);
    void (async () => {
      try {
        const handle = await readStoredHandle(projectId);
        if (cancelled || !handle) return;
        // Try to reopen directly first — Chrome may still hold the grant for a
        // same-session reload. If that throws, the permission was reset, and we
        // offer a one-click reconnect (requestPermission needs a user gesture).
        let loaded = false;
        try {
          const file = await handle.getFile();
          if (!cancelled) {
            setVideoName(file.name);
            setVideoUrl(URL.createObjectURL(file));
            loaded = true;
          }
        } catch {
          // Permission likely reset — offer reconnect below.
        }
        if (!loaded && !cancelled) {
          const permission = await handle
            .queryPermission()
            .catch(() => "prompt");
          if (permission !== "denied") {
            setVideoReconnect({ name: handle.name, handle });
          }
        }
      } catch {
        // Handle unusable — fall back to the picker.
      } finally {
        if (!cancelled) setRestoringVideo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const reconnectVideo = useCallback(() => {
    void (async () => {
      const current = videoReconnectRef.current;
      if (!current) return;
      try {
        const permission = await current.handle.requestPermission();
        if (permission !== "granted") return;
        const file = await current.handle.getFile();
        setVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
        setVideoName(file.name);
        setDraft(null);
      } catch {
        // Permission declined or the file is gone.
      } finally {
        setVideoReconnect(null);
      }
    })();
  }, []);

  const cancelReconnect = useCallback(() => {
    setVideoReconnect(null);
  }, []);

  return {
    videoRef,
    videoUrl,
    videoName,
    isPlaying,
    draft,
    loadVideo,
    loadVideoHandle,
    restoringVideo,
    videoReconnect,
    reconnectVideo,
    cancelReconnect,
    togglePlayPause,
    playRange,
    commitDraft,
    cancelDraft,
    handleVideoPlay,
    handleVideoPause,
  };
}
