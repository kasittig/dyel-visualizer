import { describe, it, expect } from 'vitest';
import { compareChartSeries } from './compareChartSeries';
import type { ChartPoint } from '@dyel/core';

type MetricData = Omit<ChartPoint, 'date'>;
type ExpectedResult = Omit<
  ReturnType<typeof compareChartSeries>,
  'seriesName' | 'pointsWithSeries'
>;

describe('compareChartSeries', () => {
  it.each<[string, MetricData[], string, ExpectedResult]>([
    ['empty data', [], 'squat', { count: 0, min: 0, max: 0, range: 0, ratio: 0, values: [] }],
    [
      'missing series',
      [{ bench: 300 }, { bench: 320 }],
      'squat',
      { count: 0, min: 0, max: 0, range: 0, ratio: 0, values: [] },
    ],
    [
      'single point',
      [{ squat: 300 }],
      'squat',
      { count: 1, min: 300, max: 300, range: 0, ratio: 1, values: [300] },
    ],
    [
      'filters missing',
      [{ squat: 300 }, { bench: 250 }, { squat: 350 }],
      'squat',
      { count: 2, min: 300, max: 350, range: 50, ratio: 7 / 6, values: [300, 350] },
    ],
    [
      'multi-value ratio',
      [{ squat: 100 }, { squat: 200 }, { squat: 300 }],
      'squat',
      { count: 3, min: 100, max: 300, range: 200, ratio: 3, values: [100, 200, 300] },
    ],
    [
      'preserves order',
      [{ squat: 350 }, { squat: 300 }, { squat: 325 }],
      'squat',
      { count: 3, min: 300, max: 350, range: 50, ratio: 7 / 6, values: [350, 300, 325] },
    ],
    [
      'realistic range',
      [
        { deadlift: 405 },
        { deadlift: 415 },
        { deadlift: 425 },
        { deadlift: 500 },
        { deadlift: 510 },
      ],
      'deadlift',
      {
        count: 5,
        min: 405,
        max: 510,
        range: 105,
        ratio: 510 / 405,
        values: [405, 415, 425, 500, 510],
      },
    ],
    [
      'mixed metrics',
      [{ squat: 300, bench: 250 }, { deadlift: 400 }, { squat: 350, bench: 275 }],
      'squat',
      { count: 2, min: 300, max: 350, range: 50, ratio: 7 / 6, values: [300, 350] },
    ],
  ])('%s', (_: string, partialData: MetricData[], seriesName: string, expected: ExpectedResult) => {
    const data: ChartPoint[] = partialData.map((p, i) => ({
      date: `2026-01-0${i + 1}T00:00:00Z`,
      ...p,
    }));

    const expectedPoints = data.filter((p) => p[seriesName as keyof ChartPoint] !== undefined);

    expect(compareChartSeries(data, seriesName)).toEqual({
      ...expected,
      seriesName,
      pointsWithSeries: expectedPoints,
    });
  });
});
