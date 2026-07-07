import type { CompositeSpec } from '@dyel/pipeline';

const composite = (id: string, lifts: string[]): CompositeSpec => ({
  id,
  kind: 'composite',
  components: lifts.map((lift) => ({ label: lift, include: { all: [`lift:${lift}`] } })),
  derive: 'e1rm',
  normalize: true,
  combine: 'sum',
});

export const TOTAL_CHART_SPECS: CompositeSpec[] = [
  composite('squat', ['squat']),
  composite('bench', ['bench']),
  composite('deadlift', ['deadlift']),
  composite('pushPull', ['bench', 'deadlift']),
  composite('total', ['squat', 'bench', 'deadlift']),
];
