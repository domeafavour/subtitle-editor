import { describe, expect, it } from "vitest";

import { nextSpeaker } from "./speaker";

describe("nextSpeaker", () => {
  it("assigns A from none", () => {
    expect(nextSpeaker(undefined)).toBe("A");
  });

  it("advances through the labels in order", () => {
    expect(nextSpeaker("A")).toBe("B");
    expect(nextSpeaker("B")).toBe("C");
  });

  it("wraps C back to none", () => {
    expect(nextSpeaker("C")).toBeUndefined();
  });
});
