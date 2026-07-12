import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ChartPoint, BestSet } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';
import { usePipelineDatasets } from '../sigma';
import {
  conjugateChartSpecs,
  buildBestSetByLabelAndDate,
  buildConjugateChartData,
  roundBestSetsForDisplay,
  dateRangeToRenderParams,
} from '@dyel/api';

export const NORMALIZED_KEY = 'normalized';

export interface PipelineConjugateChartData {
  variations: string[];
  data: ChartPoint[];
  showNormalized: boolean;
  bestSetByLabelAndDate: Map<string, Map<string, BestSet>>;
}

const EMPTY: PipelineConjugateChartData = {
  variations: [],
  data: [],
  showNormalized: false,
  bestSetByLabelAndDate: new Map(),
};

export function usePipelineConjugateChartData(
  liftType: string,
  dateRange: DateRange,
  unit: 'lbs' | 'kg'
): PipelineConjugateChartData {
  const { status, model } = usePipelineModel();
  const specs = useMemo(() => conjugateChartSpecs(liftType), [liftType]);
  const ui = useMemo(
    () => dateRangeToRenderParams(dateRange?.from, dateRange?.to),
    [dateRange.from, dateRange.to]
  );
  const datasets = usePipelineDatasets(specs, ui);

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }
    const rawVariations = datasets.variations ?? [];
    const rawNormalized = datasets.normalized ?? [];
    const { variations, data } = buildConjugateChartData(rawVariations, rawNormalized, unit);

    return {
      variations,
      data,
      showNormalized: rawNormalized.length > 0,
      bestSetByLabelAndDate: roundBestSetsForDisplay(
        buildBestSetByLabelAndDate(model.tagged, liftType),
        unit
      ),
    };
  }, [status, model, datasets, unit, liftType]);
}
