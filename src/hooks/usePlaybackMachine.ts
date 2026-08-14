import { useMachine } from "@xstate/react";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { addSubtitle } from "#/lib/subtitles";
import type { Draft } from "#/lib/types";
import { readStoredHandle, storeHandle } from "#/lib/videoHandleStore";
import { playbackMachine } from "#/store/playbackMachine";
import { projectsStore } from "#/store/projectsStore";

export interface PlaybackApi {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  videoName: string | null;
  /** Real video length in integer ms once metadata has loaded; null until then. */
  videoDuration: number | null;
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
  /** Seek to `ms` (video ms) and end paused. Clamps to 0; no-op without a video. */
  seekTo: (ms: number) => void;
  /**
   * Open the draft composer manually at the video's current position —
   * pausing the video first when it is playing. No-op without a loaded video.
   */
  openDraftAtCurrentTime: () => void;
  commitDraft: (text: string) => void;
  cancelDraft: () => void;
  /** Attach to the `<video>` element's onLoadedMetadata. */
  handleVideoMetadata: () => void;
  /** Attach to the `<video>` element's onPlay. */
  handleVideoPlay: () => void;
  /** Attach to the `<video>` element's onPause. */
  handleVideoPause: () => void;
}

/**
 * React binding for `playbackMachine`. Owns the `<video>` DOM element and the
 * object-URL lifecycle; reflects DOM events into machine events and performs
 * the DOM side-effects the machine's pure transitions imply (set `src`, play,
 * pause, currentTime, the range-end rAF watcher). Committing a draft persists
 * the line into `projectsStore` via a provided action.
 */
export function usePlaybackMachine(projectId: string): PlaybackApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The current object URL, tracked here (not in the machine) for revocation.
  const objectUrlRef = useRef<string | null>(null);

  const machine = useMemo(
    () =>
      playbackMachine.provide({
        actions: {
          commitDraft: ({ context, event }) => {
            if (event.type !== "commitDraft") return;
            const startMs = context.draft?.startMs;
            if (startMs == null) return;
            projectsStore.trigger.updateSubtitles({
              id: projectId,
              updater: (prev) => addSubtitle(prev, startMs, event.text),
            });
          },
        },
      }),
    [projectId],
  );
  const [snapshot, send] = useMachine(machine);

  // Mirror the reconnect handle into a ref so the (stable) reconnect callback
  // can read it without depending on the snapshot.
  const reconnectRef = useRef<PlaybackApi["videoReconnect"]>(null);
  reconnectRef.current = snapshot.context.videoReconnect;

  /** Create an object URL for a file, revoking the previous one. */
  const applyVideo = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    return url;
  }, []);

  const loadVideo = useCallback(
    (file: File) => {
      send({ type: "fileLoaded", name: file.name, videoUrl: applyVideo(file) });
    },
    [applyVideo, send],
  );

  const loadVideoHandle = useCallback(
    (handle: FileSystemFileHandle) => {
      void (async () => {
        try {
          const file = await handle.getFile();
          send({
            type: "handleLoaded",
            name: file.name,
            videoUrl: applyVideo(file),
          });
          void storeHandle(projectId, handle);
        } catch {
          // The file is no longer accessible — nothing to load.
        }
      })();
    },
    [applyVideo, projectId, send],
  );

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
    // The <video>'s onPlay/onPause reflect into the machine.
  }, []);

  const playRange = useCallback(
    (startMs: number, endMs: number) => {
      const video = videoRef.current;
      if (!video || endMs <= startMs) return;
      send({ type: "rangePlay", startMs, endMs });
      video.currentTime = startMs / 1000;
      void video.play();
    },
    [send],
  );

  const seekTo = useCallback((ms: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, ms) / 1000;
    // Always pause: a no-op pause() fires no pause event when already paused
    // (no spurious draft), and it aborts a pending play() so a jump never
    // auto-plays. A DOM pause while playing reaches the machine as `paused`
    // and opens a draft, matching the old behavior.
    video.pause();
  }, []);

  const commitDraft = useCallback(
    (text: string) => send({ type: "commitDraft", text }),
    [send],
  );

  const cancelDraft = useCallback(() => send({ type: "cancelDraft" }), [send]);

  const openDraftAtCurrentTime = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return; // no video (or metadata) yet — nothing to capture.
    }
    // Pause first: while playing, the DOM pause event reaches the machine
    // (`playing → paused` + openDraft) and re-anchors the draft to the pause
    // position, which is the same spot — `currentTime` is frozen after
    // `pause()`. While already paused, `pause()` fires no event (no spurious
    // draft, matching `seekTo`).
    video.pause();
    send({ type: "openDraft", startMs: Math.round(video.currentTime * 1000) });
  }, [send]);

  const handleVideoMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // `duration` is NaN before metadata and Infinity for some streams.
    if (Number.isFinite(video.duration) && video.duration > 0) {
      send({ type: "metadata", durationMs: Math.round(video.duration * 1000) });
    }
  }, [send]);

  const handleVideoPlay = useCallback(() => send({ type: "play" }), [send]);

  const handleVideoPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.ended) {
      // Natural end must not open a draft: the machine's `ended` transition
      // lands on paused before the DOM pause event arrives.
      send({ type: "ended" });
    } else {
      send({ type: "paused", startMs: Math.round(video.currentTime * 1000) });
    }
  }, [send]);

  const reconnectVideo = useCallback(() => {
    void (async () => {
      const current = reconnectRef.current;
      if (!current) return;
      try {
        const permission = await current.handle.requestPermission();
        if (permission !== "granted") {
          send({ type: "reconnectCancel" });
          return;
        }
        const file = await current.handle.getFile();
        send({
          type: "reconnectOk",
          name: file.name,
          videoUrl: applyVideo(file),
        });
      } catch {
        // Permission declined or the file is gone — fall back to the picker.
        send({ type: "reconnectCancel" });
      }
    })();
  }, [applyVideo, send]);

  const cancelReconnect = useCallback(
    () => send({ type: "reconnectCancel" }),
    [send],
  );

  // Re-open the previously picked video after a reload. A handle restored from
  // IndexedDB does not keep its permission, so when re-opening throws we send
  // `restorePrompt` instead of failing silently.
  useEffect(() => {
    let cancelled = false;
    send({ type: "restoreBegin" });
    void (async () => {
      try {
        const handle = await readStoredHandle(projectId);
        if (cancelled) return;
        if (!handle) {
          send({ type: "restoreFailed" });
          return;
        }
        // Try to reopen directly first — Chrome may still hold the grant for a
        // same-session reload. If that throws, the permission was reset.
        let loaded = false;
        try {
          const file = await handle.getFile();
          if (!cancelled) {
            send({
              type: "restoreOk",
              name: file.name,
              videoUrl: applyVideo(file),
            });
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
            send({ type: "restorePrompt", name: handle.name, handle });
          } else {
            send({ type: "restoreFailed" });
          }
        }
      } catch {
        // Handle unusable — fall back to the picker.
        if (!cancelled) send({ type: "restoreFailed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyVideo, projectId, send]);

  // Watch the active range while playing and pause exactly at its end. The
  // `rangeEnd` transition to paused (no draft) happens before the DOM pause
  // event arrives, so the pause never opens a draft.
  useEffect(() => {
    const playing = snapshot.matches({ ready: "playing" });
    const range = snapshot.context.activeRange;
    if (!playing || !range) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && video.currentTime * 1000 >= range.endMs) {
        send({ type: "rangeEnd" });
        video.pause();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [snapshot, send]);

  // Revoke the object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return {
    videoRef,
    videoUrl: snapshot.context.videoUrl,
    videoName: snapshot.context.videoName,
    videoDuration: snapshot.context.videoDuration,
    isPlaying: snapshot.matches({ ready: "playing" }),
    draft: snapshot.context.draft,
    loadVideo,
    loadVideoHandle,
    restoringVideo: snapshot.matches("restoring"),
    videoReconnect: snapshot.context.videoReconnect,
    reconnectVideo,
    cancelReconnect,
    togglePlayPause,
    playRange,
    seekTo,
    openDraftAtCurrentTime,
    commitDraft,
    cancelDraft,
    handleVideoMetadata,
    handleVideoPlay,
    handleVideoPause,
  };
}
