import type { KeyboardEvent } from "react";
import { useEffect, useState } from "react";

import { useProject } from "#/hooks/useProjectData";
import { projectsStore } from "#/store/projectsStore";

import { Popover } from "./Popover";

const STEPS_MS = [100, 500, 1000];

/**
 * Per-project timing offset control: shifts every line's displayed and
 * exported times by a live, reversible offset (stored captures are never
 * rewritten). Placed beside the timeline; seconds-based input (commits on
 * blur/Enter so a leading `-` can be typed) plus instant ± step buttons.
 * Reads/writes the global projects store — no props.
 */
export function ShiftTiming() {
  const project = useProject();
  const offsetSec =
    project?.timingOffsetMs != null ? project.timingOffsetMs / 1000 : 0;
  const [text, setText] = useState(() => String(offsetSec));

  // Keep the input in sync with the applied offset (step buttons, reset).
  useEffect(() => {
    setText(String(offsetSec));
  }, [offsetSec]);

  const setOffsetMs = (offsetMs: number) => {
    if (!project) return;
    projectsStore.trigger.setTimingOffset({ id: project.id, offsetMs });
  };

  const commit = () => {
    const parsed = Number(text);
    if (Number.isFinite(parsed)) {
      setOffsetMs(Math.round(parsed * 1000));
    } else {
      setText(String(offsetSec)); // invalid input → revert
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setText(String(offsetSec));
    }
  };

  return (
    <Popover
      button={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Shift all line timings"
          className="rounded bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-200 transition-colors hover:bg-neutral-700"
        >
          Shift
        </button>
      )}
    >
      <div className="flex w-85 flex-col gap-2 rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-neutral-400" htmlFor="shift-seconds">
            Offset (s)
          </label>
          <span className="font-mono text-xs text-neutral-500">
            {offsetSec === 0
              ? "no shift"
              : `${offsetSec > 0 ? "+" : ""}${offsetSec}s`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="shift-seconds"
            type="number"
            step={0.1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center">
          <div className="flex shrink-0 gap-1">
            {STEPS_MS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() =>
                  setOffsetMs((project?.timingOffsetMs ?? 0) + step)
                }
                title={`Later by ${step / 1000}s`}
                className="rounded bg-neutral-800 px-1.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
              >
                +{step / 1000}s
              </button>
            ))}
          </div>
          <div className="flex gap-1 ms-1">
            {STEPS_MS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() =>
                  setOffsetMs((project?.timingOffsetMs ?? 0) - step)
                }
                title={`Earlier by ${step / 1000}s`}
                className="rounded bg-neutral-800 px-1.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
              >
                −{step / 1000}s
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOffsetMs(0)}
            disabled={offsetSec === 0}
            className="ms-auto rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Moves every line earlier or later without rewriting the stored
          captures. Exports use the shifted times.
        </p>
      </div>
    </Popover>
  );
}
