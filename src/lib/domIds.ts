/**
 * DOM element ids used by the app — centralised so the components that render
 * rows and the code that scrolls/finds them agree on the same selector.
 */

const SUBTITLE_ROW_PREFIX = "subtitle-row";

/** The `id` of the DOM element rendering a subtitle row for `lineId`. */
export function subtitleRowId(lineId: string): string {
  return `${SUBTITLE_ROW_PREFIX}-${lineId}`;
}
