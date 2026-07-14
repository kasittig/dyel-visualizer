import { useState, useEffect } from 'react';
import { loadIndexPipelineModels, type LifterPipelineResult } from '@dyel/api';
import {
  fetchSheetCsv,
  publishedCsvUrl,
  sheetCsvUrl,
  extractSheetRef,
  PLACEHOLDER_ATHLETE,
  INDEX_SHEET_ID,
} from '../data-source';

type CoachViewDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: LifterPipelineResult[] };

export function useCoachViewData(): CoachViewDataState {
  const [state, setState] = useState<CoachViewDataState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    fetchSheetCsv(publishedCsvUrl(INDEX_SHEET_ID), controller.signal)
      .then((indexCsv) =>
        loadIndexPipelineModels(indexCsv, PLACEHOLDER_ATHLETE, (url) => {
          const ref = extractSheetRef(url.trim());
          return ref
            ? fetchSheetCsv(sheetCsvUrl(ref, '0'))
            : Promise.reject(new Error(`Invalid sheet URL: ${url}`));
        })
      )
      .then((data) => {
        if (isMounted) {
          setState({ status: 'success', data });
        }
      })
      .catch((err) => {
        if (isMounted && err.name !== 'AbortError') {
          setState({ status: 'error', message: String(err.message) });
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return state;
}
