import { useState, useEffect } from "react";

export type IndexEntry = { name: string; url: string };

const INDEX_SHEET_ID =
  "2PACX-1vTmiDdFL3yDqnm-sK2KvbljacO6Rq9KltzzoOJY1aFu6B2tWPejLDH4XqKW0su0j1IFSI7iA4IGmGbU";

type IndexDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; entries: IndexEntry[] };

function parseIndexCsv(csv: string): IndexEntry[] {
  const lines = csv.trim().split("\n");
  return lines.slice(1).flatMap((line) => {
    const commaIdx = line.indexOf(",");
    if (commaIdx === -1) return [];
    const name = line.slice(0, commaIdx).trim();
    const url = line.slice(commaIdx + 1).trim();
    if (!name || !url) return [];
    return [{ name, url }];
  });
}

export function useIndexData(): IndexDataState {
  const [state, setState] = useState<IndexDataState>({ status: "loading" });

  useEffect(() => {
    const base = import.meta.env.DEV
      ? "/sheets-proxy/spreadsheets"
      : "https://docs.google.com/spreadsheets";
    const url = `${base}/d/e/${INDEX_SHEET_ID}/pub?output=csv`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((csv) => setState({ status: "success", entries: parseIndexCsv(csv) }))
      .catch((err) => setState({ status: "error", message: String(err.message) }));
  }, []);

  return state;
}
