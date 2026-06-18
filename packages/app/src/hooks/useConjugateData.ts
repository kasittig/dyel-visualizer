import { useState, useEffect } from "react";
import { parseConjugateData } from "@dyel/core";
import type { ConjugateDataPair } from "@dyel/core";
import type { SheetRef } from "../utils/appUtils";

export type { ConjugateDataPair } from "@dyel/core";

type ConjugateDataState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; pairs: ConjugateDataPair[] };

export function useConjugateData(sheetRef: SheetRef | null, gid = "0"): ConjugateDataState {
  const [state, setState] = useState<ConjugateDataState>({ status: "idle" });

  useEffect(() => {
    if (!sheetRef) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    const base = import.meta.env.DEV
      ? "/sheets-proxy/spreadsheets"
      : "https://docs.google.com/spreadsheets";
    const url = sheetRef.published
      ? `${base}/d/e/${sheetRef.id}/pub?output=csv`
      : `${base}/d/${sheetRef.id}/export?format=csv&gid=${gid}`;

    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) throw new Error("Sheet not found. Check that the URL is correct.");
        if (res.status === 401 || res.status === 403)
          throw new Error(
            "This sheet is not publicly accessible. Publish it first via File → Share → Publish to web."
          );
        if (res.status === 400)
          throw new Error(
            "Could not fetch this sheet. Make sure the sheet is published to the web as CSV (File → Share → Publish to web)."
          );
        if (!res.ok) throw new Error(`Unexpected error (HTTP ${res.status}).`);
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("text/csv"))
          throw new Error(
            "This sheet is not publicly accessible. Publish it first via File → Share → Publish to web."
          );
        return res.text();
      })
      .then((csv) => setState({ status: "success", pairs: parseConjugateData(csv) }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ status: "error", message: String(err.message) });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetRef?.id, sheetRef?.published, gid]);

  return sheetRef ? state : { status: "idle" };
}
