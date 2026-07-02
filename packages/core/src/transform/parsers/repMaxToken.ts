/**
 * Shared "N followed by rm" token definition (e.g. `1rm`, `3rm`), so the CSV column matcher
 * (`findRepMaxCols.ts`), unit detection (`detectWeightUnit.ts`), and the text-line matcher
 * (`textLineToRow.ts`) can't drift apart on what counts as a rep-max marker.
 */
export const REP_MAX_TOKEN_SRC = '(\\d+)rm';
export const REP_MAX_RE = new RegExp(`^${REP_MAX_TOKEN_SRC}(\\W|$)`);
