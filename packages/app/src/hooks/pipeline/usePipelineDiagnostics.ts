import { useState, useEffect } from 'react';
import { runPipeline } from '@dyel/pipeline';
import type { RenderParams } from '@dyel/pipeline';
import type { InputMode } from '../../utils/appUtils';
import { extractSheetRef } from '../../utils/appUtils';
import { sheetCsvUrl, fetchSheetCsv } from '../../utils/sheetFetch';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../../utils/rawInputUtils';

export interface DiagnosticVariant {
  canonical: string;
  lift: string;
  effects: string[];
  status: 'optimal' | 'weakness' | 'overperforming';
  ratio: number;
  actualE1rmKg: number;
  expectedE1rmKg: number;
  staleDays: number;
}

export interface DiagnosticResult {
  variants: DiagnosticVariant[];
  hasDeadlift: boolean;
}

export function usePipelineDiagnostics(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number,
  deadliftStance: 'sumo' | 'conventional'
): DiagnosticResult {
  const [data, setData] = useState<DiagnosticResult>({ variants: [], hasDeadlift: false });

  useEffect(() => {
    const ui: RenderParams = {};
    const athlete = { ...PLACEHOLDER_ATHLETE, deadliftStance };

    if (inputMode === 'text') {
      if (!pastedText.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData({ variants: [], hasDeadlift: false });
        return;
      }
      try {
        const raw = buildRawInput('text', pastedText);
        const result = runPipeline([raw], [], athlete, ui);
        const hasDeadlift = result.diagnostics.variants.some((v) => v.lift === 'deadlift');
        setData({
          variants: result.diagnostics.variants,
          hasDeadlift,
        });
      } catch {
        setData({ variants: [], hasDeadlift: false });
      }
      return;
    }

    const sheetRef = extractSheetRef(url.trim());
    if (!sheetRef) {
      setData({ variants: [], hasDeadlift: false });
      return;
    }

    const controller = new AbortController();
    fetchSheetCsv(sheetCsvUrl(sheetRef, '0'), controller.signal)
      .then((csv) => {
        const raw = buildRawInput('url', csv);
        const result = runPipeline([raw], [], athlete, ui);
        const hasDeadlift = result.diagnostics.variants.some((v) => v.lift === 'deadlift');
        setData({
          variants: result.diagnostics.variants,
          hasDeadlift,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setData({ variants: [], hasDeadlift: false });
      });

    return () => controller.abort();
  }, [inputMode, url, pastedText, refreshToken, deadliftStance]);

  return data;
}
