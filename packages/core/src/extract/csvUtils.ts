import Papa from 'papaparse';

export function extractCsvHeaders(
  csv: string,
  keyword?: string
): { headers: string[]; lineIndex: number } | null {
  const lines = csv.trim().split('\n');
  const lineIndex = keyword
    ? lines.findIndex((l) => l.toLowerCase().includes(keyword.toLowerCase()))
    : lines.findIndex((l) => l.trim().length > 0);
  if (lineIndex === -1) {
    return null;
  }
  const headers = lines[lineIndex].split(',').map((h) => h.trim().toLowerCase());
  return { headers, lineIndex };
}

export function parseCsvRows<T>(
  csv: string,
  _headers: readonly string[],
  mapRow: (row: Record<string, string>) => T | null
): T[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  });
  return data.flatMap((row) => {
    const result = mapRow(row);
    return result !== null ? [result] : [];
  });
}
