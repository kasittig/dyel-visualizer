import { useState, useEffect } from "react";

export type SheetRow = Record<string, string>;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; rows: SheetRow[] };

function parseCsv(csv: string): SheetRow[] {
  const lines = csv.trim().split("\n");
  // Skip leading title rows by finding the first line that contains "Exercise"
  const headerIdx = lines.findIndex((l) => l.includes("Exercise"));
  if (headerIdx === -1 || headerIdx >= lines.length - 1) return [];
  const headers = lines[headerIdx].split(",").map((h) => h.trim());
  return lines.slice(headerIdx + 1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

type SheetRef = { id: string; published: boolean };

export function useSheetData(sheetRef: SheetRef | null, gid = "0"): State {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (!sheetRef) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    const base = import.meta.env.DEV
      ? "/sheets-proxy/spreadsheets"
      : "https://docs.google.com/spreadsheets";
    const url = sheetRef.published
      ? `${base}/d/e/${sheetRef.id}/pub?output=csv`
      : `${base}/d/${sheetRef.id}/export?format=csv&gid=${gid}`;

    fetch(url)
      .then((res) => {
        if (res.status === 404) {
          throw new Error("Sheet not found. Check that the URL is correct.");
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            "This sheet is not publicly accessible. Publish it first via File → Share → Publish to web."
          );
        }
        if (res.status === 400) {
          throw new Error(
            "Could not fetch this sheet. Make sure the sheet is published to the web as CSV (File → Share → Publish to web)."
          );
        }
        if (!res.ok) {
          throw new Error(`Unexpected error (HTTP ${res.status}).`);
        }
        // Google redirects private sheets to the login page (HTML), not CSV
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("text/csv")) {
          throw new Error(
            "This sheet is not publicly accessible. Publish it first via File → Share → Publish to web."
          );
        }
        return res.text();
      })
      .then((csv) => setState({ status: "success", rows: parseCsv(csv) }))
      .catch((err) =>
        setState({ status: "error", message: String(err.message) })
      );
  }, [sheetRef?.id, sheetRef?.published, gid]);

  return state;
}
