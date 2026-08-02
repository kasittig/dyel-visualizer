import { useState, useEffect } from 'react';
import { loadIndexPipelineModels, type LifterPipelineResult } from '@dyel/api';
import {
  publishedCsvUrl,
  sheetCsvUrl,
  extractSheetRef,
  PLACEHOLDER_ATHLETE,
  INDEX_SHEET_ID,
} from '../data-source';
import { cachedFetchSheetCsv } from './teamCsvCache';

type TeamViewDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: LifterPipelineResult[] };

export function useTeamViewData(): TeamViewDataState {
  const [state, setState] = useState<TeamViewDataState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    cachedFetchSheetCsv(publishedCsvUrl(INDEX_SHEET_ID), controller.signal)
      .then((indexCsv) =>
        loadIndexPipelineModels(indexCsv, PLACEHOLDER_ATHLETE, (url) => {
          const ref = extractSheetRef(url.trim());
          return ref
            ? cachedFetchSheetCsv(sheetCsvUrl(ref, '0'), controller.signal)
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
