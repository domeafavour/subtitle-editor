import type { Settings } from "#/lib/types";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

/** Reading-speed settings that drive end-time inference. */
export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <h2 className="mb-2 text-sm font-semibold text-neutral-200">Timing</h2>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Chars / sec</span>
          <input
            type="number"
            min={1}
            step={1}
            value={settings.charsPerSec}
            onChange={(event) =>
              onChange({ charsPerSec: Number(event.target.value) })
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
              onChange({ minDurationSec: Number(event.target.value) })
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
              onChange({ maxDurationSec: Number(event.target.value) })
            }
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Each line stays on screen for{" "}
        <span className="font-mono">chars ÷ rate</span>, clamped between min and
        max seconds.
      </p>
    </div>
  );
}
