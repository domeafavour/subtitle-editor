/**
 * Silent TTS duration measurement via the Web Speech API.
 *
 * The default end of a line can be derived from how long its text takes to
 * speak: we speak it at volume 0 and time the utterance, so the user never
 * hears it. Measurements are serialized (the synth is single-channel) and
 * cached per normalized text for the session. Degrades silently to `null`
 * when the API is unavailable, an utterance errors, or a timeout hits.
 */

const CACHE_LIMIT = 100;
const TIMEOUT_MS = 30_000;

const cache = new Map<string, number>();
let queue: Promise<unknown> = Promise.resolve();

/**
 * Measure how long `text` takes to speak, in integer milliseconds. Resolves
 * `null` on any failure (no API, utterance error, timeout, empty text) so
 * callers fall back to the reading estimate. Serialized: measurements never
 * overlap the single speech channel.
 */
export function measureSpeechDuration(text: string): Promise<number | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return Promise.resolve(null);
  const cached = cache.get(trimmed);
  if (cached != null) return Promise.resolve(cached);

  const run = (): Promise<number | null> =>
    new Promise((resolve) => {
      const synth = getSpeechSynthesis();
      if (!synth) {
        resolve(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.volume = 0;
      const start = performance.now();
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (value: number | null) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (value != null) {
          cache.set(trimmed, value);
          if (cache.size > CACHE_LIMIT) {
            cache.delete(cache.keys().next().value as string);
          }
        }
        resolve(value);
      };
      utterance.onend = () => finish(Math.round(performance.now() - start));
      utterance.onerror = () => finish(null);
      synth.speak(utterance);
      timer = setTimeout(() => finish(null), TIMEOUT_MS);
    });

  // Chain onto the queue so only one utterance is measured at a time.
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return "speechSynthesis" in window ? window.speechSynthesis : null;
}
