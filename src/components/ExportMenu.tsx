import { useLines, useProject } from "#/hooks/useProjectData";
import { downloadBlob } from "#/lib/download";
import { toSrt } from "#/lib/srt";
import { toVtt } from "#/lib/vtt";

import { Popover } from "./Popover";

/**
 * Header export menu — bakes the computed end times into the downloaded files.
 * Reads the current project and its lines from the global store; no props.
 */
export function ExportMenu() {
  const project = useProject();
  const lines = useLines();
  const disabled = lines.length === 0;
  const baseName = project?.name ?? "subtitles";
  const itemClass =
    "w-full rounded px-3 py-1.5 text-left text-sm text-neutral-200 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40";

  const exportSrt = () =>
    downloadBlob(`${baseName}.srt`, toSrt(lines), "text/plain;charset=utf-8");
  const exportVtt = () =>
    downloadBlob(`${baseName}.vtt`, toVtt(lines), "text/vtt;charset=utf-8");

  return (
    <Popover
      button={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-1 rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700"
        >
          Export
          <span aria-hidden="true" className="text-xs text-neutral-400">
            ▾
          </span>
        </button>
      )}
    >
      {(close) => (
        <div
          role="menu"
          className="flex w-40 flex-col gap-0.5 rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            title={disabled ? "Add a subtitle first" : undefined}
            onClick={() => {
              exportSrt();
              close();
            }}
            className={itemClass}
          >
            Export .srt
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            title={disabled ? "Add a subtitle first" : undefined}
            onClick={() => {
              exportVtt();
              close();
            }}
            className={itemClass}
          >
            Export .vtt
          </button>
        </div>
      )}
    </Popover>
  );
}
