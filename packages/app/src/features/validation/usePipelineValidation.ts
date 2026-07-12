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

export function usePipelineValidation() {
  const [state, setState] = useState<PipelineValidationState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const verdict = useMemo(() => {
    return state.status === 'success' ? classifyPipelineVerdict(state.result) : null;
  }, [state]);

  const validateUrl = (url: string) => {
    const ref = extractSheetRef(url.trim());
    if (!ref) {
      setState({ status: 'error', message: "That doesn't look like a Google Sheet URL." });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'loading' });

    fetchSheetCsv(sheetCsvUrl(ref, '0'), controller.signal)
      .then((csv) => {
        setState({
          status: 'success',
          result: validatePipelineRun([buildRawInput('url', csv)], PLACEHOLDER_ATHLETE),
        });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      });
  };

  const validateText = (text: string) => {
    if (!text.trim()) {
      setState({ status: 'idle' });
      return;
    }
    try {
      setState({
        status: 'success',
        result: validatePipelineRun([buildRawInput('text', text)], PLACEHOLDER_ATHLETE),
      });
    } catch (err: unknown) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return { state, validateUrl, validateText, verdict };
}
