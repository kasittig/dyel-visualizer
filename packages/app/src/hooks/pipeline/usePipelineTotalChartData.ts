import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { runPipeline } from '@dyel/pipeline';
import type { RenderParams } from '@dyel/pipeline';
import type { ChartPoint } from '@dyel/core';
import type { InputMode } from '../../utils/appUtils';
import { extractSheetRef } from '../../utils/appUtils';
import { sheetCsvUrl, fetchSheetCsv } from '../../utils/sheetFetch';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../../utils/rawInputUtils';
import { TOTAL_CHART_SPECS } from '../../pipeline/totalChartSpecs';
import { mergeRechartsRowsToChartPoints } from '../../utils/pipelineChartUtils';

const TOTAL_CHART_IDS = ['squat', 'bench', 'deadlift', 'pushPull', 'total'];

export function usePipelineTotalChartData(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number,
  dateRange: DateRange,
  unit: 'lbs' | 'kg'
): ChartPoint[] {
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const ui: RenderParams =
      dateRange.from && dateRange.to
        ? { dateRange: [dateRange.from.getTime(), dateRange.to.getTime()] }
        : {};

    if (inputMode === 'text') {
      if (!pastedText.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData([]);
        return;
      }
      try {
        const raw = buildRawInput('text', pastedText);
        const result = runPipeline([raw], TOTAL_CHART_SPECS, PLACEHOLDER_ATHLETE, ui);
        setData(mergeRechartsRowsToChartPoints(result.datasets, TOTAL_CHART_IDS, unit));
      } catch {
        setData([]);
      }
      return;
    }

    const sheetRef = extractSheetRef(url.trim());
    if (!sheetRef) {
      setData([]);
      return;
    }

    const controller = new AbortController();
    fetchSheetCsv(sheetCsvUrl(sheetRef, '0'), controller.signal)
      .then((csv) => {
        const raw = buildRawInput('url', csv);
        const result = runPipeline([raw], TOTAL_CHART_SPECS, PLACEHOLDER_ATHLETE, ui);
        setData(mergeRechartsRowsToChartPoints(result.datasets, TOTAL_CHART_IDS, unit));
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setData([]);
      });

    return () => controller.abort();
    // dateRange is intentionally included so pipeline output (and, for url mode, the
    // network refetch) recomputes on date range changes; the redundant refetch is
    // acceptable for this scoped migration.
  }, [inputMode, url, pastedText, refreshToken, dateRange.from, dateRange.to, unit]);

  return data;
}
