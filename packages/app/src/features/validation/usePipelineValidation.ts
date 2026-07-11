import { useState, useRef, useMemo } from 'react';
import type { PipelineResult } from '@dyel/api';
import { validatePipelineRun, classifyPipelineVerdict } from '@dyel/api';
import {
  extractSheetRef,
  sheetCsvUrl,
  fetchSheetCsv,
  buildRawInput,
  PLACEHOLDER_ATHLETE,
} from '../data-source';

type PipelineValidationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: PipelineResult };

export function usePipelineValidation(): {
  state: PipelineValidationState;
  validateUrl: (url: string) => void;
  validateText: (text: string) => void;
  verdict: 'ok' | 'warning' | 'error' | null;
} {
  const [state, setState] = useState<PipelineValidationState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const verdict = useMemo(() => {
    const activeResult = state.status === 'success' ? state.result : null;
    return activeResult ? classifyPipelineVerdict(activeResult) : null;
  }, [state]);

  function validateUrl(url: string) {
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
      .then((csv) => {
        const raw = buildRawInput('url', csv);
        const result = validatePipelineRun([raw], PLACEHOLDER_ATHLETE);
        setState({ status: 'success', result });
      })
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

  function validateText(text: string) {
    if (!text.trim()) {
      setState({ status: 'idle' });
      return;
    }
    try {
      const raw = buildRawInput('text', text);
      const result = validatePipelineRun([raw], PLACEHOLDER_ATHLETE);
      setState({ status: 'success', result });
    } catch (err: unknown) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { state, validateUrl, validateText, verdict };
}
