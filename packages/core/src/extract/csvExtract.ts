import { extractCsvHeaders, parseCsvRows } from './csvUtils';
import type { RawRow } from './types';

/**
 * Finds the header row (first line containing "exercise") and parses everything below it as
 * CSV with the project's canonical options (lowercased/trimmed headers, trimmed values).
 * Returns `null` when there is no usable header row — the shared guard for both the real
 * parser and the validator, so they can never disagree on what counts as a parseable sheet.
 */
export function extractCsvRows(
  csv: string,
  keyword: string = 'exercise'
): { headerIdx: number; rows: RawRow[] } | null {
  const lines = csv.trim().split('\n');
  const result = extractCsvHeaders(csv, keyword);
  if (result === null || result.lineIndex >= lines.length - 1) {
    return null;
  }
  const { lineIndex: headerIdx } = result;

  const rows = parseCsvRows<RawRow>(lines.slice(headerIdx).join('\n'), [], (row) => row);
  return { headerIdx, rows };
}
