export interface IndexEntry {
  name: string;
  url: string;
}

export function parseIndexCsv(csv: string): IndexEntry[] {
  const lines = csv
    .trim()
    .split('\n')
    .map((l) => l.trim());
  const idx = lines.findIndex(
    (l) => l.length > 0 && (l.toLowerCase().includes('name') || l.toLowerCase().includes('url'))
  );

  if (idx === -1) {
    return [];
  }

  const hdrs = lines[idx].split(',').map((h) => h.trim().toLowerCase());
  const nameIdx = hdrs.indexOf('name');
  const urlIdx = hdrs.indexOf('url');

  if (nameIdx === -1 || urlIdx === -1) {
    return [];
  }

  const entries: IndexEntry[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    const vals = line.split(',').map((v) => v.trim());
    const name = vals[nameIdx];
    const url = vals[urlIdx];

    if (name && url) {
      entries.push({ name, url });
    }
  }

  return entries;
}
