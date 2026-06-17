import Papa from "papaparse";

export type IndexEntry = { name: string; url: string };

export function parseIndexCsv(csv: string): IndexEntry[] {
  const { data } = Papa.parse<{ name: string; url: string }>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return data.flatMap((row) => {
    const name = row.name?.trim();
    const url = row.url?.trim();
    if (!name || !url) return [];
    return [{ name, url }];
  });
}
