import { afterEach, describe, expect, it, vi } from "vitest";

import { speakText } from "./speech";

interface FakeSynthesis {
  cancel: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
}

interface FakeUtterance {
  text: string;
}

/** Stub window.speechSynthesis and SpeechSynthesisUtterance. */
function stubSpeechSynthesis() {
  const synth: FakeSynthesis = { cancel: vi.fn(), speak: vi.fn() };
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  return synth;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("speakText", () => {
  it("speaks the given text", () => {
    const synth = stubSpeechSynthesis();
    speakText("Hello there");
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(synth.speak).toHaveBeenCalledOnce();
    const utterance = synth.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe("Hello there");
  });

  it("speaks multi-line text verbatim", () => {
    const synth = stubSpeechSynthesis();
    speakText("Line one\nLine two");
    const utterance = synth.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe("Line one\nLine two");
  });

  it("cancels the previous utterance before speaking", () => {
    const synth = stubSpeechSynthesis();
    speakText("First");
    speakText("Second");
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    const utterance = synth.speak.mock.calls[1]?.[0] as FakeUtterance;
    expect(utterance.text).toBe("Second");
  });

  it("no-ops when speechSynthesis is unavailable", () => {
    vi.stubGlobal("window", {});
    expect(() => speakText("Hello")).not.toThrow();
  });

  it("no-ops without a window (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(() => speakText("Hello")).not.toThrow();
  });

  it("no-ops for empty or whitespace text", () => {
    const synth = stubSpeechSynthesis();
    speakText("");
    speakText("   ");
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });
});
