import { useLines, useProject } from "#/hooks/useProjectData";
import { downloadBlob } from "#/lib/download";
import { toSrt } from "#/lib/srt";
import { toVtt } from "#/lib/vtt";

/**
 * Export actions — bakes the computed end times into the downloaded files.
 * Reads the current project and its lines from the global store — no props.
 */
export function Toolbar() {
  const project = useProject();
  const lines = useLines();
  const disabled = lines.length === 0;
  const baseName = project?.name ?? "subtitles";
  const buttonClass =
    "rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          downloadBlob(
            `${baseName}.srt`,
            toSrt(lines),
            "text/plain;charset=utf-8",
          )
        }
        className={buttonClass}
      >
        Export .srt
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          downloadBlob(
            `${baseName}.vtt`,
            toVtt(lines),
            "text/vtt;charset=utf-8",
          )
        }
        className={buttonClass}
      >
        Export .vtt
      </button>
    </div>
  );
}
