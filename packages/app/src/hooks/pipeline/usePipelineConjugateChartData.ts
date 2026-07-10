import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { RenderParams, RechartsRow, ChartPoint } from '@dyel/pipeline';
import { usePipelineModel } from '../../context/PipelineContext';
import { usePipelineDatasets } from './usePipelineDatasets';
import { conjugateChartSpecs } from '../../pipeline/conjugateChartSpecs';
import { buildBestSetByLabelAndDate, type BestSet } from '../../pipeline/conjugateBestSet';
import { mergeWideRechartsRows } from '../../utils/pipelineChartUtils';
import { roundWeight } from '../../utils/weightUnit';

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
  const ui: RenderParams = useMemo(
    () =>
      dateRange.from && dateRange.to
        ? { dateRange: [dateRange.from.getTime(), dateRange.to.getTime()] }
        : {},
    [dateRange.from, dateRange.to]
  );
  const datasets = usePipelineDatasets(specs, ui);

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }

    const rawVariations = datasets.variations ?? [];
    const rawNormalized = datasets.normalized ?? [];

    const variations = [
      ...new Set(rawVariations.flatMap((r) => Object.keys(r).filter((k) => k !== 't'))),
    ].sort();

    const combinedByT = new Map<number, RechartsRow>();
    for (const row of rawVariations) {
      combinedByT.set(row.t, { ...combinedByT.get(row.t), ...row });
    }
    for (const row of rawNormalized) {
      combinedByT.set(row.t, { ...combinedByT.get(row.t), ...row });
    }
    const data = mergeWideRechartsRows([...combinedByT.values()], unit);

    const bestSetByLabelAndDateKg = buildBestSetByLabelAndDate(model.tagged, liftType);
    const bestSetByLabelAndDate = new Map(
      [...bestSetByLabelAndDateKg].map(([label, byDate]) => [
        label,
        new Map(
          [...byDate].map(([date, set]) => [
            date,
            { ...set, weight: roundWeight(set.weight, unit) },
          ])
        ),
      ])
    );

    return {
      variations,
      data,
      showNormalized: rawNormalized.length > 0,
      bestSetByLabelAndDate,
    };
  }, [status, model, datasets, unit, liftType]);
}
