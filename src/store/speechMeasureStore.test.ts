import { describe, expect, it } from "vitest";

import { createSpeechMeasureStore } from "./speechMeasureStore";

function newStore() {
  return createSpeechMeasureStore();
}

describe("speechMeasureStore", () => {
  it("starts empty", () => {
    expect(newStore().getSnapshot().context.measuring).toEqual([]);
  });

  it("tracks a measuring line id", () => {
    const store = newStore();
    store.trigger.start({ id: "a" });
    expect(store.getSnapshot().context.measuring).toEqual(["a"]);
  });

  it("start is idempotent for an already-measuring id", () => {
    const store = newStore();
    store.trigger.start({ id: "a" });
    store.trigger.start({ id: "a" });
    expect(store.getSnapshot().context.measuring).toEqual(["a"]);
  });

  it("tracks multiple ids independently", () => {
    const store = newStore();
    store.trigger.start({ id: "a" });
    store.trigger.start({ id: "b" });
    expect(store.getSnapshot().context.measuring).toEqual(["a", "b"]);
  });

  it("end removes only the given id", () => {
    const store = newStore();
    store.trigger.start({ id: "a" });
    store.trigger.start({ id: "b" });
    store.trigger.end({ id: "a" });
    expect(store.getSnapshot().context.measuring).toEqual(["b"]);
    store.trigger.end({ id: "b" });
    expect(store.getSnapshot().context.measuring).toEqual([]);
  });

  it("end for an unknown id is a no-op", () => {
    const store = newStore();
    store.trigger.end({ id: "nope" });
    expect(store.getSnapshot().context.measuring).toEqual([]);
  });
});
