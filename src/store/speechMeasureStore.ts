import { createStore } from "@xstate/store";

interface SpeechMeasureContext {
  /** Line ids whose speech duration is currently being measured. */
  measuring: string[];
}

/**
 * Transient (non-persisted) set of line ids with an in-flight speech-duration
 * measurement. Subtitle rows subscribe to it to show a spinner until the
 * measurement settles — success, failure, or timeout. Entries are removed by
 * the callers' `.finally` when the measurement promise settles.
 */
export function createSpeechMeasureStore() {
  return createStore({
    context: { measuring: [] } as SpeechMeasureContext,
    on: {
      start: (context, event: { id: string }) => ({
        ...context,
        measuring: context.measuring.includes(event.id)
          ? context.measuring
          : [...context.measuring, event.id],
      }),
      end: (context, event: { id: string }) => ({
        ...context,
        measuring: context.measuring.filter((id) => id !== event.id),
      }),
    },
  });
}

/** The app-wide singleton. */
export const speechMeasureStore = createSpeechMeasureStore();
