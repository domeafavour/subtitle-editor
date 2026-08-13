import { useEffect } from "react";

interface GlobalShortcuts {
  togglePlayPause: () => void;
  /** Move the playhead to the current/next line's start, paused. */
  jumpToStart: () => void;
  /** Move the playhead to the current/next line's end, paused. */
  jumpToEnd: () => void;
}

/**
 * Global editor shortcuts: Space toggles play/pause, `[` jumps to the current
 * line's start, `]` to its end (both without playing).
 *
 * All bindings are skipped when the keydown target is editable (input,
 * textarea, contentEditable) so the user can type those keys literally.
 */
export function useGlobalShortcuts({
  togglePlayPause,
  jumpToStart,
  jumpToEnd,
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, jumpToStart, jumpToEnd]);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
