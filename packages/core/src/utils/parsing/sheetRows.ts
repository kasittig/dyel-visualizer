import { extractCsvHeaders, parseCsvRows } from './csvUtils';

export type RawRow = Record<string, string>;

/**
 * Finds the header row (first line containing "exercise") and parses everything below it as
 * CSV with the project's canonical options (lowercased/trimmed headers, trimmed values).
 * Returns `null` when there is no usable header row — the shared guard for both the real
 * parser and the validator, so they can never disagree on what counts as a parseable sheet.
 */
export function parseSheetRows(csv: string): { headerIdx: number; rows: RawRow[] } | null {
  const lines = csv.trim().split('\n');
  const result = extractCsvHeaders(csv, 'exercise');
  if (result === null || result.lineIndex >= lines.length - 1) {
    return null;
  }
  const { lineIndex: headerIdx } = result;

  const rows = parseCsvRows<RawRow>(lines.slice(headerIdx).join('\n'), [], (row) => row);
  return { headerIdx, rows };
}

/** Reads the weight unit from a `weight (lbs)` / `weight (kg)` style column header. */
export function detectWeightUnit(keys: string[]): 'lbs' | 'kg' | null {
  const key = keys.find((k) => /^weight(\W|$)/.test(k));
  if (!key) {
    return null;
  }
  if (key.includes('kg')) {
    return 'kg';
  }
  if (key.includes('lb')) {
    return 'lbs';
  }
  return null;
}
