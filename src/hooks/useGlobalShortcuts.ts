import { useEffect } from "react";

interface GlobalShortcuts {
  togglePlayPause: () => void;
  /** Move the playhead to the current/next line's start, paused. */
  jumpToStart: () => void;
  /** Move the playhead to the current/next line's end, paused. */
  jumpToEnd: () => void;
  /** Step the playhead backward by one frame, paused. */
  stepBackward: () => void;
  /** Step the playhead forward by one frame, paused. */
  stepForward: () => void;
  /** Open the draft composer at the current playhead (the Add line button). */
  addLine: () => void;
}

/**
 * Global editor shortcuts: Space toggles play/pause, `[` jumps to the current
 * line's start, `]` to its end, ← / → step by one frame (all ending paused),
 * and `n` opens the draft composer at the playhead.
 *
 * All bindings are skipped when the keydown target is editable (input,
 * textarea, contentEditable) so the user can type those keys literally.
 */
export function useGlobalShortcuts({
  togglePlayPause,
  jumpToStart,
  jumpToEnd,
  stepBackward,
  stepForward,
  addLine,
}: GlobalShortcuts): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      switch (event.code) {
        case "Space":
          // Prevent the page scrolling and the <video>'s native space-toggle,
          // which would double-toggle alongside our own handler.
          event.preventDefault();
          togglePlayPause();
          break;
        case "BracketLeft":
          event.preventDefault();
          jumpToStart();
          break;
        case "BracketRight":
          event.preventDefault();
          jumpToEnd();
          break;
        case "ArrowLeft":
          // Prevent the page scrolling on the arrow keys.
          event.preventDefault();
          stepBackward();
          break;
        case "ArrowRight":
          event.preventDefault();
          stepForward();
          break;
        case "KeyN":
          // Plain `n` only — Ctrl/Cmd+N (browser "new window") and other
          // modifier combos must not add a line.
          if (event.ctrlKey || event.metaKey || event.altKey) break;
          event.preventDefault();
          addLine();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlayPause,
    jumpToStart,
    jumpToEnd,
    stepBackward,
    stepForward,
    addLine,
  ]);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
