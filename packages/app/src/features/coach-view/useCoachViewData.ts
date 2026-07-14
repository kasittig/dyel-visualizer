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

/**
 * Status union for fetching and parsing an index of lifter pipeline models.
 * Mirrors CsvResource's shape but cannot reuse it directly since CsvResource
 * requires a synchronous parse function, while loadIndexPipelineModels handles
 * async per-lifter fetches internally.
 */
type CoachViewDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: LifterPipelineResult[] };

/**
 * Fetches the published index sheet CSV and uses loadIndexPipelineModels to
 * fetch and parse each lifter's sheet concurrently. Individual per-lifter
 * failures are isolated as error results within the returned array; only
 * hard index-CSV-fetch or loadIndexPipelineModels failures set hook-level error.
 */
export function useCoachViewData(): CoachViewDataState {
  const [state, setState] = useState<CoachViewDataState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    fetchSheetCsv(publishedCsvUrl(INDEX_SHEET_ID), controller.signal)
      .then((indexCsv) => {
        // Inject fetchSheetCsv without AbortSignal param for loadIndexPipelineModels.
        // Per-lifter URLs come from the index sheet as raw share/edit/published links, so
        // they must be normalized into a real CSV endpoint first (mirrors useResolvedRawInput).
        return loadIndexPipelineModels(indexCsv, PLACEHOLDER_ATHLETE, (url) => {
          const ref = extractSheetRef(url.trim());
          if (!ref) {
            return Promise.reject(new Error(`Invalid sheet URL: ${url}`));
          }
          return fetchSheetCsv(sheetCsvUrl(ref, '0'));
        });
      })
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
