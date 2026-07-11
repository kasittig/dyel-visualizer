export interface IndexEntry {
  name: string;
  url: string;
}

/**
 * Parse a two-column CSV (name, url) into IndexEntry objects.
 * Skips rows where name or url is empty.
 */
export function parseIndexCsv(csv: string): IndexEntry[] {
  const lines = csv
    .trim()
    .split('\n')
    .map((line) => line.trim());

  // Find header row (should be first non-empty line containing 'name' or 'url')
  const headerLineIndex = lines.findIndex(
    (line) =>
      line.length > 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('url'))
  );

  if (headerLineIndex === -1) {
    return [];
  }

  // Parse headers: split by comma, lowercase, and trim
  const headerLine = lines[headerLineIndex];
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

  const nameIndex = headers.indexOf('name');
  const urlIndex = headers.indexOf('url');

  // If either column is missing, return empty
  if (nameIndex === -1 || urlIndex === -1) {
    return [];
  }

  // Parse data rows
  const entries: IndexEntry[] = [];
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      continue; // Skip empty lines
    }

    const values = line.split(',').map((v) => v.trim());
    const name = values[nameIndex];
    const url = values[urlIndex];

    // Only include rows with both name and url
    if (name && url) {
      entries.push({ name, url });
    }
  }

  return entries;
}
