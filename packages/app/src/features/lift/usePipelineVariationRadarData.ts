import { useMemo } from 'react';
import type { RenderParams } from '@dyel/api';
import {
  buildLastSessionDetail,
  snapshotVariationsFromPipeline,
  snapshotNormalizedVariationsFromPipeline,
  buildCanonicalByLabel,
  resolveTargetLabel,
  conjugateChartSpecs,
  buildRadarRows,
  type LastSessionDetail,
} from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';
import { usePipelineDatasets } from '../sigma';

export interface PipelineVariationRadarData {
  snapshot: Record<string, number | undefined>;
  normalizedSnapshot: Record<string, number | undefined>;
  lastSessionByLabel: Map<string, LastSessionDetail>;
  targetLabel: string | undefined;
  canonicalByLabel: Map<string, string>;
  data: ReturnType<typeof buildRadarRows>;
}

const EMPTY: PipelineVariationRadarData = {
  snapshot: {},
  normalizedSnapshot: {},
  lastSessionByLabel: new Map(),
  targetLabel: undefined,
  canonicalByLabel: new Map(),
  data: [],
};

/**
 * Pipeline-native data source for `VariationRadarChart.tsx`. Returns both `snapshot`
 * (each variation's raw, un-normalized last-session e1RM) and `normalizedSnapshot`
 * (cross-exercise-normalized, via `@dyel/pipeline`'s `NormalizationModel`/`normalizeE1rm`
 * against the model's fixed lift-family baseline canonical — see
 * `snapshotNormalizedVariationsFromPipeline`'s doc comment for the omission rule for
 * unfitted/unmapped labels). `VariationRadarChart` currently only displays
 * `normalizedSnapshot` (baseline-only cross-exercise normalization, reintroduced after
 * being deprecated during the #460 pipeline swap — see `migration/VariationRadarChart.md`'s
 * "Cross-exercise normalization reintroduced" section); `snapshot` is kept on this hook's
 * return for potential other consumers and because `normalizedSnapshot`'s correctness was
 * verified against it via `variationRadarChartParity.test.ts`'s raw-snapshot test (0.0%
 * divergence from legacy).
 *
 * Note: `VariationRadarChart` does not filter by date range (its `rows` prop comes
 * pre-filtered from `LiftTabPanel`'s own date-range filtering upstream), so this hook
 * passes an empty `RenderParams` to `usePipelineDatasets`, meaning the pipeline dataset
 * itself is unfiltered by date. This matches the fact that `snapshotVariationsFromPipeline`
 * only cares about the single most-recent row anyway, so date-range filtering doesn't
 * change its output.
 *
 * `targetCanonical` (e.g. `App.tsx`'s `effectiveTargetCanonicals`, sourced from
 * `defaultCompExerciseCanonical`) is a stable canonical id, but `snapshot` is keyed by
 * variation *label* (raw logged exercise string — see `conjugateChartSpecs`'s
 * `groupBy: 'label'` and `@dyel/pipeline`'s `Point.series` docs). Indexing `snapshot`
 * directly with the canonical id silently misses (labels can drift/reword over time and
 * rarely equal the canonical slug), which drops the target overlay ring in
 * `VariationRadarChart`. This hook resolves `targetCanonical` to its current label —
 * most-recent-by-date, mirroring `@dyel/pipeline`'s own `displayNameLatest` logic in
 * `pipeline.ts` — and returns it as `targetLabel` for the caller to index `snapshot` with.
 *
 * `canonicalByLabel` maps each variation label to its most-recently-logged canonical id,
 * enabling a future cross-exercise normalization step to look up each label's NormalizationModel factor.
 */
export function usePipelineVariationRadarData(
  liftType: string,
  unit: 'lbs' | 'kg',
  targetCanonical?: string
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
    const canonicalByLabel = buildCanonicalByLabel(model.tagged, liftType);

    // Apply cross-exercise normalization to get per-variation normalized e1RM values.
    // Use the offset-adjusted dataset (variationsAdjusted) as input to ensure weight-space
    // corrections from equipment/bands/chains are applied before the normalization step.
    const normalizedSnapshot = snapshotNormalizedVariationsFromPipeline(
      datasets.variationsAdjusted ?? [],
      canonicalByLabel,
      model.model,
      unit
    );

    // Resolve the target's canonical id to its most-recently-logged label so callers can
    // index `snapshot` (label-keyed) correctly.
    const targetLabel = resolveTargetLabel(model.tagged, liftType, targetCanonical);

    // Build radar rows from normalized snapshot
    const data = buildRadarRows(normalizedSnapshot, targetLabel);

    return {
      snapshot,
      normalizedSnapshot,
      lastSessionByLabel,
      targetLabel,
      canonicalByLabel,
      data,
    };
  }, [status, model, datasets, unit, liftType, targetCanonical]);
}
