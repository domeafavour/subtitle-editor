import { useEffect } from "react";

import type { PlaybackApi } from "./usePlayback";

/**
 * Global Space = play/pause toggle.
 *
 * The binding is skipped when the keydown target is editable (input, textarea,
 * contentEditable) so the user can type real spaces into a subtitle. Enter/ESC
 * are deliberately not global — they belong to whichever input is focused.
 */
export function useGlobalShortcuts({
  togglePlayPause,
}: Pick<PlaybackApi, "togglePlayPause">): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (isEditableTarget(event.target)) return;
      // Prevent the page scrolling and the <video>'s native space-toggle,
      // which would double-toggle alongside our own handler.
      event.preventDefault();
      togglePlayPause();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause]);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
