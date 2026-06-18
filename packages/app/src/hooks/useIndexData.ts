import { useState, useEffect } from "react";
import { parseIndexCsv, type IndexEntry } from "@dyel/core";

export type { IndexEntry };

const INDEX_SHEET_ID =
  "2PACX-1vTmiDdFL3yDqnm-sK2KvbljacO6Rq9KltzzoOJY1aFu6B2tWPejLDH4XqKW0su0j1IFSI7iA4IGmGbU";

type IndexDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; entries: IndexEntry[] };

export function useIndexData(): IndexDataState {
  const [state, setState] = useState<IndexDataState>({ status: "loading" });

  useEffect(() => {
    const base = import.meta.env.DEV
      ? "/sheets-proxy/spreadsheets"
      : "https://docs.google.com/spreadsheets";
    const url = `${base}/d/e/${INDEX_SHEET_ID}/pub?output=csv`;

    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((csv) => setState({ status: "success", entries: parseIndexCsv(csv) }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ status: "error", message: String(err.message) });
      });

    return () => controller.abort();
  }, []);

  return state;
}
