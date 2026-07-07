import type { DatasetSpec } from '@dyel/pipeline';

// Both specs use 'e1rm-max-effort' (not 'e1rm') to match legacy's buildVariationChartData
// (packages/core/src/load/buildVariationChartData.ts), which computes BOTH its per-variation
// series and its normalizedByDate/__normalized__ composite exclusively from
// tabRows[liftType].maxEffort — max-effort rows only, never dynamic-effort/volume rows. The
// 'e1rm-max-effort' deriver returns null (not a fallback e1RM) for a day with no max-effort
// sets, and callers exclude that day's point entirely rather than zero-filling it — mirroring
// legacy's day-level splitByEffort exclusion (see migration/ConjugateCharts.md, Finding #5).
export function conjugateChartSpecs(liftType: string): DatasetSpec[] {
  const include = { all: [`lift:${liftType}`] };
  return [
    { id: 'variations', kind: 'series', include, derive: 'e1rm-max-effort', groupBy: 'label' },
    {
      id: 'normalized',
      kind: 'composite',
      components: [{ label: liftType, include }],
      derive: 'e1rm-max-effort',
      normalize: true,
      combine: 'sum',
    },
  ];
}
