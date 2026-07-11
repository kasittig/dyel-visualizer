import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ChartPoint } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';
import { usePipelineDatasets } from './usePipelineDatasets';
import {
  conjugateChartSpecs,
  buildBestSetByLabelAndDate,
  buildConjugateChartData,
  roundBestSetsForDisplay,
  dateRangeToRenderParams,
  type BestSet,
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

/**
 * Pipeline-native replacement for `useConjugateChartData` (which called `@dyel/core`'s
 * `buildVariationChartData`). Sourced entirely from the shared `PipelineModel` via
 * `usePipelineDatasets` -- never calls `runPipeline` directly, per the pipeline migration
 * boundary rule.
 *
 * Note: unlike legacy's `VariationChartResult`, there is no `effectiveTargetName`/
 * `baselineExercise` here -- the "Competition variation" normalization-target dropdown was
 * intentionally deprecated (not carried over) when this component was swapped onto the
 * pipeline. The `normalized` composite always normalizes to the model's fixed lift-family
 * baseline (`conjugateChartSpecs`' `normalize: true` composite), matching every other
 * pipeline-native normalized series (`TotalChart`, `SigmaTab`).
 */
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

    const bestSetByLabelAndDateKg = buildBestSetByLabelAndDate(model.tagged, liftType);
    const bestSetByLabelAndDate = roundBestSetsForDisplay(bestSetByLabelAndDateKg, unit);

    return {
      variations,
      data,
      showNormalized: rawNormalized.length > 0,
      bestSetByLabelAndDate,
    };
  }, [status, model, datasets, unit, liftType]);
}
