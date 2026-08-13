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

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}
