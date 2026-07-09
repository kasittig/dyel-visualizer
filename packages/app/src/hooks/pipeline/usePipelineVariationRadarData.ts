import { useMemo } from 'react';
import type { RenderParams } from '@dyel/pipeline';
import { usePipelineModel } from '../../context/PipelineContext';
import { usePipelineDatasets } from './usePipelineDatasets';
import { conjugateChartSpecs } from '../../pipeline/conjugateChartSpecs';
import { buildLastSessionDetail, type LastSessionDetail } from '../../pipeline/lastSessionDetail';
import { snapshotVariationsFromPipeline } from '../../utils/variationSnapshot';

export interface PipelineVariationRadarData {
  snapshot: Record<string, number | undefined>;
  lastSessionByLabel: Map<string, LastSessionDetail>;
}

const EMPTY: PipelineVariationRadarData = {
  snapshot: {},
  lastSessionByLabel: new Map(),
};

/**
 * Pipeline-native replacement for `VariationRadarChart.tsx`'s previous cross-exercise
 * per-target normalization via `@dyel/core`'s `normalizeToBaseE1RM`. This hook returns
 * each variation's **raw**, un-normalized last-session e1RM instead, matching the same
 * "deprecate the per-target feature" decision already made for `ConjugateCharts`' target-selection
 * dropdown (see `migration/ConjugateCharts.md`'s "ConjugateCharts swap-over" section, closes #459).
 *
 * The cross-exercise normalization was root-caused as safe to omit by a parity test
 * showing 0.0% divergence between legacy's raw (un-normalized) per-variation e1RM and
 * the pipeline's — see `packages/app/src/pipeline/variationRadarChartParity.test.ts`'s
 * raw-snapshot test.
 *
 * Note: `VariationRadarChart` does not filter by date range (its `rows` prop comes
 * pre-filtered from `LiftTabPanel`'s own date-range filtering upstream), so this hook
 * passes an empty `RenderParams` to `usePipelineDatasets`, meaning the pipeline dataset
 * itself is unfiltered by date. This matches the fact that `snapshotVariationsFromPipeline`
 * only cares about the single most-recent row anyway, so date-range filtering doesn't
 * change its output.
 */
export function usePipelineVariationRadarData(
  liftType: string,
  unit: 'lbs' | 'kg'
): PipelineVariationRadarData {
  const { status, model } = usePipelineModel();
  const specs = useMemo(() => conjugateChartSpecs(liftType), [liftType]);
  const ui: RenderParams = useMemo(() => ({}), []);
  const datasets = usePipelineDatasets(specs, ui);

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }

    const snapshot = snapshotVariationsFromPipeline(datasets.variations ?? [], unit);
    const lastSessionByLabel = buildLastSessionDetail(model.tagged, liftType);

    return {
      snapshot,
      lastSessionByLabel,
    };
  }, [status, model, datasets, unit, liftType]);
}
