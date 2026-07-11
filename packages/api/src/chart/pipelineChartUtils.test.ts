import { describe, it, expect } from 'vitest';
import {
  latestLiftE1RMs,
  mergeRechartsRowsToChartPoints,
  mergeWideRechartsRows,
} from './pipelineChartUtils';
import type { RechartsRow, ChartPoint } from '@dyel/pipeline';

const row = (t: number, id: string, v: number): RechartsRow => ({ t, [id]: v });
const point = (t: number, overrides?: Partial<ChartPoint>): ChartPoint => ({
  date: new Date(t).toISOString(),
  ...overrides,
});

describe('latestLiftE1RMs', () => {
  it.each([
    ['empty data', [], { squat: undefined, bench: undefined, deadlift: undefined }],
    [
      'single lift type',
      [point(1000, { squat: 300 })],
      { squat: 300, bench: undefined, deadlift: undefined },
    ],
    [
      'forward-fills last value per lift',
      [
        point(1000, { squat: 300 }),
        point(2000, { squat: 310, bench: 200 }),
        point(3000, { deadlift: 450 }),
      ],
      { squat: 310, bench: 200, deadlift: 450 },
    ],
    [
      'only includes defined lifts',
      [point(1000, { bench: 200, deadlift: 400 })],
      { squat: undefined, bench: 200, deadlift: 400 },
    ],
    [
      'picks latest value for each lift across multiple points',
      [
        point(1000, { squat: 280, bench: 180 }),
        point(2000, { squat: 300 }),
        point(3000, { bench: 200, deadlift: 450 }),
      ],
      { squat: 300, bench: 200, deadlift: 450 },
    ],
  ])('latestLiftE1RMs: %s', (_, data, expected) => {
    expect(latestLiftE1RMs(data)).toEqual(expected);
  });
});

describe('mergeRechartsRowsToChartPoints', () => {
  it.each([
    [
      'merges two datasets sharing the same timestamp into one row, converting kg to lbs',
      { squat: [row(1000, 'squat', 100.4)], bench: [row(1000, 'bench', 80.6)] },
      ['squat', 'bench'],
      'lbs' as const,
      [{ date: new Date(1000).toISOString(), squat: 221, bench: 178 }],
    ],
    [
      'leaves a column unset on timestamps where its dataset has no row',
      {
        squat: [row(1000, 'squat', 100), row(2000, 'squat', 110)],
        bench: [row(2000, 'bench', 90)],
      },
      ['squat', 'bench'],
      'lbs' as const,
      [
        { date: new Date(1000).toISOString(), squat: 220 },
        { date: new Date(2000).toISOString(), squat: 243, bench: 198 },
      ],
    ],
    [
      'sorts unsorted input rows ascending by date across three datasets',
      {
        squat: [row(3000, 'squat', 100)],
        bench: [row(1000, 'bench', 80)],
        deadlift: [row(2000, 'deadlift', 150)],
      },
      ['squat', 'bench', 'deadlift'],
      'lbs' as const,
      [
        { date: new Date(1000).toISOString(), bench: 176 },
        { date: new Date(2000).toISOString(), deadlift: 331 },
        { date: new Date(3000).toISOString(), squat: 220 },
      ],
    ],
    [
      'passes values through unconverted when unit is kg',
      { squat: [row(1000, 'squat', 100.4)] },
      ['squat'],
      'kg' as const,
      [{ date: new Date(1000).toISOString(), squat: 100 }],
    ],
  ])('%s', (_, datasets, ids, unit, expected) => {
    expect(mergeRechartsRowsToChartPoints(datasets, ids, unit)).toEqual(expected);
  });

  it('does not include a key with an explicit undefined for a missing column', () => {
    const [point] = mergeRechartsRowsToChartPoints(
      { squat: [row(1000, 'squat', 100)] },
      ['squat'],
      'kg'
    );
    expect(Object.keys(point).sort()).toEqual(['date', 'squat']);
  });
});

describe('mergeWideRechartsRows', () => {
  it.each([
    [
      'copies every non-t column on a row into the point',
      [{ t: 1000, box: 100, ssb: 90 }],
      'kg' as const,
      [{ date: new Date(1000).toISOString(), box: 100, ssb: 90 }],
    ],
    [
      'copies only date for a row with no columns besides t',
      [{ t: 1000 }],
      'kg' as const,
      [{ date: new Date(1000).toISOString() }],
    ],
    [
      'converts kg to lbs and rounds',
      [{ t: 1000, box: 100.4 }],
      'lbs' as const,
      [{ date: new Date(1000).toISOString(), box: 221 }],
    ],
  ])('%s', (_, rows, unit, expected) => {
    expect(mergeWideRechartsRows(rows, unit)).toEqual(expected);
  });
});
