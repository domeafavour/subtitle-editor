/**
 * Text-to-speech via the Web Speech API.
 *
 * A browser-side side-effect used by the per-line read-aloud button: clicking
 * it reads the line's text aloud. Degrades silently when the API is
 * unavailable (SSR, unsupported browsers).
 */

/** Read `text` aloud at `rate` (speechSpeed multiplier, 1 = normal). Cancels
 * any ongoing utterance so rapid clicks don't queue. */
export function speakText(text: string, rate = 1): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) return;
  const synth = getSpeechSynthesis();
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  if (Number.isFinite(rate) && rate > 0) utterance.rate = rate;
  synth.speak(utterance);
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return "speechSynthesis" in window ? window.speechSynthesis : null;
}
