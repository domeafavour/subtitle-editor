import { useSelector } from "@xstate/react";

import { settingsStore } from "#/store/settingsStore";

/**
 * Timing settings that drive end-time derivation, read/updated via the global
 * settings store — no props. The "Default end" selector chooses between the
 * reading-speed estimate and the measured speech duration; the reading inputs
 * still matter in speech mode as the fallback while a line is unmeasured.
 */
export function SettingsPanel() {
  const settings = useSelector(
    settingsStore,
    (snapshot) => snapshot.context.settings,
  );

  const update = (patch: Partial<typeof settings>) => {
    settingsStore.trigger.update({ patch });
  };

  const speech = settings.endMode === "speech";

  return (
    <div className="min-w-80 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <h2 className="mb-2 text-sm font-semibold text-neutral-200">Timing</h2>

      <div className="mb-3">
        <span className="mb-1 block text-xs text-neutral-400">Default end</span>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-800 p-1">
          <button
            type="button"
            onClick={() => update({ endMode: "reading" })}
            aria-pressed={!speech}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              !speech
                ? "bg-neutral-600 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Reading speed
          </button>
          <button
            type="button"
            onClick={() => update({ endMode: "speech" })}
            aria-pressed={speech}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              speech
                ? "bg-neutral-600 text-neutral-100"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Speech duration
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Chars / sec</span>{" "}
          <input
            type="number"
            min={1}
            step={1}
            value={settings.charsPerSec}
            onChange={(event) =>
              update({ charsPerSec: Number(event.target.value) })
            }
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Min (s)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={settings.minDurationSec}
            onChange={(event) =>
              update({ minDurationSec: Number(event.target.value) })
            }
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Max (s)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={settings.maxDurationSec}
            onChange={(event) =>
              update({ maxDurationSec: Number(event.target.value) })
            }
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      {speech && (
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Speech speed</span>
          <input
            type="number"
            min={0.5}
            max={2}
            step={0.1}
            value={settings.speechSpeed}
            onChange={(event) =>
              update({ speechSpeed: Number(event.target.value) })
            }
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </label>
      )}

      <p className="mt-2 text-xs text-neutral-500">
        {speech ? (
          <>
            New lines end after their spoken duration, measured by the browser
            TTS — <span className="font-mono">chars ÷ rate</span> is the
            fallback while measuring.
          </>
        ) : (
          <>
            Each line stays on screen for{" "}
            <span className="font-mono">chars ÷ rate</span>, clamped between min
            and max seconds.
          </>
        )}
      </p>

      <label className="mt-3 flex items-start gap-2 border-t border-neutral-800 pt-3">
        <input
          type="checkbox"
          checked={settings.openDraftOnPause}
          onChange={(event) =>
            update({ openDraftOnPause: event.target.checked })
          }
          className="mt-0.5 h-3.5 w-3.5 accent-blue-500"
        />
        <span className="text-xs text-neutral-300">
          Open a draft when the video pauses
        </span>
      </label>
    </div>
  );
}
