import type { DatasetSpec } from '@dyel/pipeline';

// Comp lifts (squat/bench/deadlift) use 'e1rm-max-effort' (not 'e1rm') to match legacy's
// buildVariationChartData (packages/core/src/load/buildVariationChartData.ts), which computes
// BOTH its per-variation series and its normalizedByDate/__normalized__ composite exclusively
// from tabRows[liftType].maxEffort — max-effort rows only, never dynamic-effort/volume rows. The
// 'e1rm-max-effort' deriver returns null (not a fallback e1RM) for a day with no max-effort
// sets, and callers exclude that day's point entirely rather than zero-filling it — mirroring
// legacy's day-level splitByEffort exclusion (see migration/ConjugateCharts.md, Finding #5).
//
// Accessories use 'e1rm' instead: the "speed work vs. max effort" split is a conjugate
// main-lift concept (multi-set/no-RPE day = dynamic effort, distinct from a near-maximal top
// single) that has no equivalent for accessory training — logging e.g. 4x10 dumbbell curls
// with no RPE is just normal accessory volume, not "speed work." Reusing 'e1rm-max-effort' for
// accessories caused nearly every accessory day to be misclassified as speed-work-only and
// dropped from the chart entirely, since accessory sets are almost never logged with an RPE.
// 'e1rm' shares the same isSpeedWork classification but never drops a day — it falls back to
// deriving from the speed-work sets when that's all a day has (see derive/CLAUDE.md).
export function conjugateChartSpecs(liftType: string): DatasetSpec[] {
  const include = { all: [`lift:${liftType}`] };
  const derive = liftType === 'accessory' ? 'e1rm' : 'e1rm-max-effort';
  return [
    { id: 'variations', kind: 'series', include, derive, groupBy: 'label' },
    {
      id: 'normalized',
      kind: 'composite',
      components: [{ label: liftType, include }],
      derive,
      normalize: true,
      combine: 'sum',
    },
    // Offset-corrected raw e1RM values for VariationRadarChart's cross-exercise normalization step.
    // This sources from the pipeline's pointsByLabelByDeriverAdjusted map (with addlWtOffset
    // correction applied) instead of raw pointsByLabelByDeriver. The normalized snapshot
    // computation in usePipelineVariationRadarData then applies normalizeE1rm's variantFactor
    // division on top of these offset-corrected values, avoiding double-counting of equipment
    // effects (bands/chains/slingshot addlWt). The raw 'variations' spec stays untouched for
    // per-variation raw display and the un-normalized snapshot.
    {
      id: 'variationsAdjusted',
      kind: 'series',
      include,
      derive,
      groupBy: 'label',
      normalize: true,
    },
  ];
}
