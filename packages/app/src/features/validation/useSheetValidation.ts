import { useState, useRef } from 'react';
import type { SheetValidationResult } from '@dyel/api';
import { validateSheetCsv } from '@dyel/api';
import { extractSheetRef, sheetCsvUrl, fetchSheetCsv } from '../data-source';

type ValidationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: SheetValidationResult; sheetUrl: string };

export function useSheetValidation(): [ValidationState, (url: string) => void] {
  const [state, setState] = useState<ValidationState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  function validate(url: string) {
    const trimmed = url.trim();
    const sheetRef = extractSheetRef(trimmed);
    if (!sheetRef) {
      setState({ status: 'error', message: "That doesn't look like a Google Sheet URL." });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'loading' });
    fetchSheetCsv(sheetCsvUrl(sheetRef, '0'), controller.signal)
      .then((csv) =>
        setState({ status: 'success', result: validateSheetCsv(csv), sheetUrl: trimmed })
      )
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }

  return [state, validate];
}
