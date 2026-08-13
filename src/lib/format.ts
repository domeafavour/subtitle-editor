/**
 * Timestamp formatting. Times are integer milliseconds.
 */

/** SRT timestamps use a comma before the milliseconds: `HH:MM:SS,mmm`. */
export function formatMsSrt(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(milli)}`;
}

/** VTT timestamps use a dot before the milliseconds: `HH:MM:SS.mmm`. */
export function formatMsVtt(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad3(milli)}`;
}

/** Display format used in list rows (same as VTT). */
export function formatTimestamp(ms: number): string {
  return formatMsVtt(ms);
}

/** Seconds as a trimmed decimal string, e.g. 1500 → "1.5", 10001 → "10.001". */
export function formatEndSeconds(ms: number): string {
  return String(ms / 1000);
}

/**
 * Parse a plain non-negative decimal seconds string into integer milliseconds.
 * Accepts `"12.5"`, `"1"`, `".5"`. Rejects empty, `"1e3"`, `"abc"`, `"12.5.5"`,
 * `"-5"` → null.
 */
export function parseSecondsToMs(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d*\.?\d+$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 1000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}
