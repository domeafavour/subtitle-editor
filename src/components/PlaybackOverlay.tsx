import { useActiveLineValue } from "#/hooks/editorContext";

/**
 * Renders the active subtitle over the video.
 *
 * Reads the editor's single shared active line (computed by `EditorShell`'s
 * `useActiveLine`), which tracks the video's current time — during playback
 * and after any paused seek (native progress bar or the keyboard: ←/→,
 * `[`/`]`, …) — so the overlay always shows the line the playhead is inside,
 * matching the highlighted row by construction.
 */
export function PlaybackOverlay() {
  const active = useActiveLineValue();

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4">
      {active && (
        <div className="max-w-[90%] rounded bg-black/70 px-3 py-1.5 text-center text-xl font-medium text-white whitespace-pre-line">
          {active.text}
        </div>
      )}
    </div>
  );
}
