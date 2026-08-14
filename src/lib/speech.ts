/**
 * Text-to-speech via the Web Speech API.
 *
 * A browser-side side-effect used by the per-line speaker button: clicking it
 * reads the line aloud so the user can hear it while assigning a speaker.
 * Degrades silently when the API is unavailable (SSR, unsupported browsers).
 */

/** Read `text` aloud. Cancels any ongoing utterance so rapid clicks don't queue. */
export function speakText(text: string): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) return;
  const synth = getSpeechSynthesis();
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  synth.speak(utterance);
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return "speechSynthesis" in window ? window.speechSynthesis : null;
}
