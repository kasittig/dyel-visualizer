import { useState } from "react";
import { validateSheetCsv } from "@dyel/core";
import type { SheetValidationResult } from "@dyel/core";
import { extractSheetRef } from "../utils/appUtils";
import { sheetCsvUrl, fetchSheetCsv } from "../utils/sheetFetch";

type ValidationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: SheetValidationResult; sheetUrl: string };

export function useSheetValidation(): [ValidationState, (url: string) => void] {
  const [state, setState] = useState<ValidationState>({ status: "idle" });

  function validate(url: string) {
    const trimmed = url.trim();
    const sheetRef = extractSheetRef(trimmed);
    if (!sheetRef) {
      setState({ status: "error", message: "That doesn't look like a Google Sheet URL." });
      return;
    }

    setState({ status: "loading" });
    fetchSheetCsv(sheetCsvUrl(sheetRef, "0"))
      .then((csv) =>
        setState({ status: "success", result: validateSheetCsv(csv), sheetUrl: trimmed })
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
