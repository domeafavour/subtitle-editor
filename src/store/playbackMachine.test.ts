import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { playbackMachine } from "./playbackMachine";

function newActor() {
  const actor = createActor(playbackMachine);
  actor.start();
  return actor;
}

function load(actor: ReturnType<typeof newActor>) {
  actor.send({ type: "fileLoaded", name: "clip.mp4", videoUrl: "blob:clip" });
}

const fakeHandle = { name: "clip.mp4" } as FileSystemFileHandle;

describe("playbackMachine — video loading and restore", () => {
  it("starts empty", () => {
    const actor = newActor();
    expect(actor.getSnapshot().value).toBe("empty");
  });

  it("loads a file into ready.paused with the video metadata", () => {
    const actor = newActor();
    load(actor);
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
    expect(actor.getSnapshot().context.videoName).toBe("clip.mp4");
    expect(actor.getSnapshot().context.videoUrl).toBe("blob:clip");
    expect(actor.getSnapshot().context.draft).toBeNull();
  });

  it("restores to empty when no stored handle exists", () => {
    const actor = newActor();
    actor.send({ type: "restoreBegin" });
    expect(actor.getSnapshot().matches("restoring")).toBe(true);
    actor.send({ type: "restoreFailed" });
    expect(actor.getSnapshot().matches("empty")).toBe(true);
  });

  it("restores straight into ready.paused when the handle reopens", () => {
    const actor = newActor();
    actor.send({ type: "restoreBegin" });
    actor.send({ type: "restoreOk", name: "clip.mp4", videoUrl: "blob:clip" });
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
  });

  it("surfaces a reconnect prompt and clears it on grant or cancel", () => {
    const actor = newActor();
    actor.send({ type: "restoreBegin" });
    actor.send({ type: "restorePrompt", name: "clip.mp4", handle: fakeHandle });
    expect(actor.getSnapshot().matches("reconnect")).toBe(true);
    expect(actor.getSnapshot().context.videoReconnect?.name).toBe("clip.mp4");

    actor.send({
      type: "reconnectOk",
      name: "clip.mp4",
      videoUrl: "blob:clip",
    });
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
    expect(actor.getSnapshot().context.videoReconnect).toBeNull();
  });
});

describe("playbackMachine — the draft rule", () => {
  it("opens a draft on a user pause while playing", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "play" });
    expect(actor.getSnapshot().matches({ ready: "playing" })).toBe(true);

    actor.send({ type: "paused", startMs: 1_500 });
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
    expect(actor.getSnapshot().context.draft).toEqual({ startMs: 1_500 });
  });

  it("does not open a draft on a range end (programmatic pause)", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "play" });
    actor.send({ type: "rangeEnd" });
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
    expect(actor.getSnapshot().context.draft).toBeNull();
  });

  it("does not open a draft on natural end", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "play" });
    actor.send({ type: "ended" });
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
    expect(actor.getSnapshot().context.draft).toBeNull();
  });

  it("ignores a stray pause event once already paused (no double draft)", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "paused", startMs: 100 });
    expect(actor.getSnapshot().context.draft).toBeNull();
  });

  it("clears the draft when playback starts again", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "play" });
    actor.send({ type: "paused", startMs: 500 });
    expect(actor.getSnapshot().context.draft).toEqual({ startMs: 500 });

    actor.send({ type: "play" });
    expect(actor.getSnapshot().context.draft).toBeNull();
  });

  it("cancels the draft", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "play" });
    actor.send({ type: "paused", startMs: 500 });
    actor.send({ type: "cancelDraft" });
    expect(actor.getSnapshot().context.draft).toBeNull();
  });
});

describe("playbackMachine — committing a draft", () => {
  it("commits the draft, calls the provided action, and clears it", () => {
    const commits: Array<{ startMs: number; text: string }> = [];
    const machine = playbackMachine.provide({
      actions: {
        commitDraft: ({ context, event }) => {
          if (event.type !== "commitDraft") return;
          commits.push({
            startMs: context.draft?.startMs ?? -1,
            text: event.text,
          });
        },
      },
    });
    const actor = createActor(machine);
    actor.start();
    load(actor);
    actor.send({ type: "play" });
    actor.send({ type: "paused", startMs: 500 });
    actor.send({ type: "commitDraft", text: "Hello" });

    expect(commits).toEqual([{ startMs: 500, text: "Hello" }]);
    expect(actor.getSnapshot().context.draft).toBeNull();
  });

  it("rejects a blank commit and keeps the draft open", () => {
    const commits: unknown[] = [];
    const machine = playbackMachine.provide({
      actions: {
        commitDraft: () => {
          commits.push(true);
        },
      },
    });
    const actor = createActor(machine);
    actor.start();
    load(actor);
    actor.send({ type: "play" });
    actor.send({ type: "paused", startMs: 500 });
    actor.send({ type: "commitDraft", text: "   " });

    expect(commits).toHaveLength(0);
    expect(actor.getSnapshot().context.draft).toEqual({ startMs: 500 });
  });
});

describe("playbackMachine — ranges and metadata", () => {
  it("plays a range and auto-pauses at its end without a draft", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "rangePlay", startMs: 1_000, endMs: 3_000 });
    expect(actor.getSnapshot().matches({ ready: "playing" })).toBe(true);
    expect(actor.getSnapshot().context.activeRange).toEqual({
      startMs: 1_000,
      endMs: 3_000,
    });

    actor.send({ type: "rangeEnd" });
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
    expect(actor.getSnapshot().context.activeRange).toBeNull();
    expect(actor.getSnapshot().context.draft).toBeNull();
  });

  it("user-pausing mid-range opens a draft and clears the range", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "rangePlay", startMs: 1_000, endMs: 5_000 });
    actor.send({ type: "paused", startMs: 2_000 });
    expect(actor.getSnapshot().matches({ ready: "paused" })).toBe(true);
    expect(actor.getSnapshot().context.draft).toEqual({ startMs: 2_000 });
    expect(actor.getSnapshot().context.activeRange).toBeNull();
  });

  it("records the video duration from metadata", () => {
    const actor = newActor();
    load(actor);
    actor.send({ type: "metadata", durationMs: 5_000 });
    expect(actor.getSnapshot().context.videoDuration).toBe(5_000);
  });
});
