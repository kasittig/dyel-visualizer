import { parseCsvRows } from '../extract/csvUtils';

export interface IndexEntry {
  name: string;
  url: string;
}

export function parseIndexCsv(csv: string): IndexEntry[] {
  return parseCsvRows(csv, ['name', 'url'], (row) => {
    const name = row['name'];
    const url = row['url'];
    if (!name || !url) {
      return null;
    }
    return { name, url };
  });
}
