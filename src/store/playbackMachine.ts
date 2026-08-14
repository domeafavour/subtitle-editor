import { assign, setup } from "xstate";

import { isMeaningful, sanitizeText } from "#/lib/text";
import type { Draft } from "#/lib/types";

interface PlaybackContext {
  videoUrl: string | null;
  videoName: string | null;
  /** Real video length in integer ms once metadata has loaded; null until then. */
  videoDuration: number | null;
  /** The in-progress line captured at a pause point, before it is committed. */
  draft: Draft | null;
  /** Range currently being played (auto-paused at its end by the rAF watcher). */
  activeRange: { startMs: number; endMs: number } | null;
  /** A stored handle awaiting a permission re-grant after a reload. */
  videoReconnect: { name: string; handle: FileSystemFileHandle } | null;
}

type PlaybackEvent =
  | { type: "fileLoaded"; name: string; videoUrl: string }
  | { type: "handleLoaded"; name: string; videoUrl: string }
  | { type: "restoreBegin" }
  | { type: "restoreOk"; name: string; videoUrl: string }
  | { type: "restorePrompt"; name: string; handle: FileSystemFileHandle }
  | { type: "restoreFailed" }
  | { type: "reconnectOk"; name: string; videoUrl: string }
  | { type: "reconnectCancel" }
  | { type: "play" }
  | { type: "paused"; startMs: number }
  /** Open the draft composer manually at an arbitrary playhead position. */
  | { type: "openDraft"; startMs: number }
  | { type: "rangePlay"; startMs: number; endMs: number }
  | { type: "rangeEnd" }
  | { type: "ended" }
  | { type: "metadata"; durationMs: number }
  | { type: "commitDraft"; text: string }
  | { type: "cancelDraft" };

/**
 * The video/draft lifecycle as a state machine.
 *
 * Draft rule (the reason this is a machine): a draft opens on the
 * `ready.playing → ready.paused` transition driven by the DOM `paused` event,
 * or manually via `openDraft` from the "Add line" button (the hook pauses the
 * DOM video, so the pause that follows re-anchors the draft to the same spot).
 * Programmatic pauses (`rangeEnd`, `ended`) transition to `paused` first, so
 * the DOM pause that follows lands on an already-paused state and is ignored —
 * no `suppressDraftRef` needed. `commitDraft` is a provided action (see
 * `usePlaybackMachine`) that persists the line; the machine itself is pure.
 *
 * The assign actions are declared here as named actions because XState types
 * shared actions against the full event union (their `event` is the union, so
 * each narrows with an `"x" in event` check).
 */
export const playbackMachine = setup({
  types: {
    context: {} as PlaybackContext,
    events: {} as PlaybackEvent,
  },
  actions: {
    /** Provided by `usePlaybackMachine`; persists the committed line. */
    commitDraft: () => {},
    /** Bring a video in — shared by loaded/restored/reconnected. */
    loadVideo: assign({
      videoUrl: ({ event }) => ("videoUrl" in event ? event.videoUrl : null),
      videoName: ({ event }) => ("name" in event ? event.name : null),
      videoDuration: null,
      draft: null,
      activeRange: null,
      videoReconnect: null,
    }),
    setReconnect: assign({
      videoReconnect: ({ context, event }) =>
        "handle" in event
          ? { name: event.name, handle: event.handle }
          : context.videoReconnect,
      draft: null,
    }),
    clearReconnect: assign({ videoReconnect: null }),
    openDraft: assign({
      draft: ({ event }) =>
        "startMs" in event ? { startMs: event.startMs } : null,
      activeRange: null,
    }),
    clearDraft: assign({ draft: null }),
    setActiveRange: assign({
      activeRange: ({ context, event }) =>
        "startMs" in event && "endMs" in event
          ? { startMs: event.startMs, endMs: event.endMs }
          : context.activeRange,
    }),
    clearActiveRange: assign({ activeRange: null }),
    setDuration: assign({
      videoDuration: ({ context, event }) =>
        "durationMs" in event ? event.durationMs : context.videoDuration,
    }),
  },
}).createMachine({
  context: (): PlaybackContext => ({
    videoUrl: null,
    videoName: null,
    videoDuration: null,
    draft: null,
    activeRange: null,
    videoReconnect: null,
  }),
  initial: "empty",
  states: {
    empty: {
      on: {
        restoreBegin: "restoring",
        fileLoaded: {
          target: "ready.paused",
          actions: [{ type: "loadVideo" }],
        },
        handleLoaded: {
          target: "ready.paused",
          actions: [{ type: "loadVideo" }],
        },
      },
    },
    restoring: {
      on: {
        restoreOk: { target: "ready.paused", actions: [{ type: "loadVideo" }] },
        restorePrompt: {
          target: "reconnect",
          actions: [{ type: "setReconnect" }],
        },
        restoreFailed: {
          target: "empty",
          actions: [{ type: "clearReconnect" }],
        },
        fileLoaded: {
          target: "ready.paused",
          actions: [{ type: "loadVideo" }],
        },
        handleLoaded: {
          target: "ready.paused",
          actions: [{ type: "loadVideo" }],
        },
      },
    },
    reconnect: {
      on: {
        reconnectOk: {
          target: "ready.paused",
          actions: [{ type: "loadVideo" }],
        },
        reconnectCancel: {
          target: "empty",
          actions: [{ type: "clearReconnect" }],
        },
        fileLoaded: {
          target: "ready.paused",
          actions: [{ type: "loadVideo" }],
        },
        handleLoaded: {
          target: "ready.paused",
          actions: [{ type: "loadVideo" }],
        },
      },
    },
    ready: {
      initial: "paused",
      on: {
        metadata: { actions: [{ type: "setDuration" }] },
      },
      states: {
        paused: {
          on: {
            play: {
              target: "playing",
              actions: [{ type: "clearDraft" }, { type: "clearActiveRange" }],
            },
            rangePlay: {
              target: "playing",
              actions: [{ type: "setActiveRange" }],
            },
            commitDraft: {
              guard: ({ context, event }) =>
                context.draft != null && isMeaningful(sanitizeText(event.text)),
              actions: [{ type: "commitDraft" }, assign({ draft: null })],
            },
            cancelDraft: { actions: [{ type: "clearDraft" }] },
            openDraft: { actions: [{ type: "openDraft" }] },
            fileLoaded: { target: "paused", actions: [{ type: "loadVideo" }] },
            handleLoaded: {
              target: "paused",
              actions: [{ type: "loadVideo" }],
            },
          },
        },
        playing: {
          on: {
            paused: {
              target: "paused",
              actions: [{ type: "openDraft" }],
            },
            openDraft: { actions: [{ type: "openDraft" }] },
            rangePlay: { actions: [{ type: "setActiveRange" }] },
            rangeEnd: {
              target: "paused",
              actions: [{ type: "clearActiveRange" }],
            },
            ended: {
              target: "paused",
              actions: [{ type: "clearActiveRange" }, { type: "clearDraft" }],
            },
            fileLoaded: { target: "paused", actions: [{ type: "loadVideo" }] },
            handleLoaded: {
              target: "paused",
              actions: [{ type: "loadVideo" }],
            },
          },
        },
      },
    },
  },
});
