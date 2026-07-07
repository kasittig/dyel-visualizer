import { useState, useEffect } from 'react';
import { runPipeline } from '@dyel/pipeline';
import type { RenderParams } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import type { InputMode } from '../../utils/appUtils';
import { extractSheetRef } from '../../utils/appUtils';
import { sheetCsvUrl, fetchSheetCsv } from '../../utils/sheetFetch';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../../utils/rawInputUtils';
import { conjugateChartSpecs } from '../../pipeline/conjugateChartSpecs';
import {
  mergeWideRechartsRows,
  mergeRechartsRowsToChartPoints,
} from '../../utils/pipelineChartUtils';

export const NORMALIZED_KEY = 'normalized';
export const NORMALIZED_COLOR = 'var(--chart-blue)';
export const NORMALIZED_LABEL = 'Normalized e1RM';

export interface ConjugateChartData {
  variations: string[];
  data: ChartPoint[];
  showNormalized: boolean;
}

export function useConjugateChartData(
  liftType: string,
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number,
  unit: 'lbs' | 'kg'
): ConjugateChartData {
  const [result, setResult] = useState<ConjugateChartData>({
    variations: [],
    data: [],
    showNormalized: false,
  });

  useEffect(() => {
    const specs = conjugateChartSpecs(liftType);
    const ui: RenderParams = {};

    function handleRaw(raw: ReturnType<typeof buildRawInput>) {
      const pipelineResult = runPipeline([raw], specs, PLACEHOLDER_ATHLETE, ui);
      const variationRows = mergeWideRechartsRows(pipelineResult.datasets.variations ?? [], unit);
      const variations = [
        ...new Set(variationRows.flatMap((row) => Object.keys(row).filter((k) => k !== 'date'))),
      ];
      const normalizedPoints = mergeRechartsRowsToChartPoints(
        { [NORMALIZED_KEY]: pipelineResult.datasets.normalized ?? [] },
        [NORMALIZED_KEY],
        unit
      );
      const normalizedByDate = new Map(normalizedPoints.map((p) => [p.date, p[NORMALIZED_KEY]]));

      const data = variationRows.map((row) => {
        const merged = { ...row };
        const normalized = normalizedByDate.get(row.date);
        if (normalized !== undefined) {
          merged[NORMALIZED_KEY] = normalized;
        }
        return merged;
      });

      setResult({
        variations,
        data,
        showNormalized: normalizedByDate.size > 0,
      });
    }

    if (inputMode === 'text') {
      if (!pastedText.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult({ variations: [], data: [], showNormalized: false });
        return;
      }
      try {
        handleRaw(buildRawInput('text', pastedText));
      } catch {
        setResult({ variations: [], data: [], showNormalized: false });
      }
      return;
    }

    const sheetRef = extractSheetRef(url.trim());
    if (!sheetRef) {
      setResult({ variations: [], data: [], showNormalized: false });
      return;
    }

    const controller = new AbortController();
    fetchSheetCsv(sheetCsvUrl(sheetRef, '0'), controller.signal)
      .then((csv) => handleRaw(buildRawInput('url', csv)))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setResult({ variations: [], data: [], showNormalized: false });
      });

    return () => controller.abort();
  }, [liftType, inputMode, url, pastedText, refreshToken, unit]);

  return result;
}
