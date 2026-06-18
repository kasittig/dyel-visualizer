import { useState } from "react";
import { validateSheetCsv } from "@dyel/core";
import type { SheetValidationResult } from "@dyel/core";
import { extractSheetRef } from "../utils/appUtils";

type ValidationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: SheetValidationResult; sheetUrl: string };

export function useSheetValidation(): [ValidationState, (url: string) => void] {
  const [state, setState] = useState<ValidationState>({ status: "idle" });

  function validate(url: string) {
    const sheetRef = extractSheetRef(url.trim());
    if (!sheetRef) {
      setState({ status: "error", message: "That doesn't look like a Google Sheet URL." });
      return;
    }

    setState({ status: "loading" });
    const base = import.meta.env.DEV
      ? "/sheets-proxy/spreadsheets"
      : "https://docs.google.com/spreadsheets";
    const fetchUrl = sheetRef.published
      ? `${base}/d/e/${sheetRef.id}/pub?output=csv`
      : `${base}/d/${sheetRef.id}/export?format=csv&gid=0`;

    fetch(fetchUrl)
      .then((res) => {
        if (res.status === 404) throw new Error("Sheet not found. Check that the URL is correct.");
        if (res.status === 401 || res.status === 403)
          throw new Error(
            "This sheet is not publicly accessible. Publish it first via File → Share → Publish to web."
          );
        if (res.status === 400)
          throw new Error(
            "Could not fetch this sheet. Make sure it is published to the web (File → Share → Publish to web)."
          );
        if (!res.ok) throw new Error(`Unexpected error (HTTP ${res.status}).`);
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("text/csv"))
          throw new Error(
            "This sheet is not publicly accessible. Publish it first via File → Share → Publish to web."
          );
        return res.text();
      })
      .then((csv) =>
        setState({ status: "success", result: validateSheetCsv(csv), sheetUrl: url.trim() })
      )
      .catch((err: unknown) =>
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        })
      );
  }

  return [state, validate];
}
