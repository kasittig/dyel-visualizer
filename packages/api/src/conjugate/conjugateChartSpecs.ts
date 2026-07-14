import type { DatasetSpec } from '@dyel/pipeline';

/**
 * Generates dataset specs for conjugate tracking.
 * - Non-accessories use 'e1rm-max-effort' to only track top-effort sets and drop speed days.
 * - Accessories use 'e1rm' because they lack a "speed vs max effort" distinction, ensuring
 *   normal volume days aren't misclassified and omitted.
 * - 'variationsAdjusted' includes offset-corrected equipment values for radar charts.
 */
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
