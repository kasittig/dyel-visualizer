import type { DatasetSpec } from '@dyel/pipeline';

export function conjugateChartSpecs(liftType: string): DatasetSpec[] {
  const include = { all: [`lift:${liftType}`] };
  return [
    { id: 'variations', kind: 'series', include, derive: 'e1rm', groupBy: 'label' },
    {
      id: 'normalized',
      kind: 'composite',
      components: [{ label: liftType, include }],
      derive: 'e1rm',
      normalize: true,
      combine: 'sum',
    },
  ];
}
