import { describe, it, expect } from 'vitest';
import type { RechartsRow, ChartPoint } from '@dyel/pipeline';
import {
  latestLiftE1RMs,
  mergeVolumeIntoChartPoints,
  mergeRechartsRowsToChartPoints,
  mergeWideRechartsRows,
} from './pipelineChartUtils';

const row = (t: number, id: string, v: number): RechartsRow => ({ t, [id]: v });
const point = (t: number, overrides?: Partial<ChartPoint>): ChartPoint => ({
  date: new Date(t).toISOString(),
  ...overrides,
});

describe('mergeVolumeIntoChartPoints', () => {
  it('rounds matched accessory volume for display and leaves unmatched dates unchanged', () => {
    expect(
      mergeVolumeIntoChartPoints(
        [{ date: '2024-03-15' }, { date: '2024-03-16', squat: 300 }],
        new Map([['2024-03-15', 1234.56]])
      )
    ).toEqual([{ date: '2024-03-15', volume: 1235 }, { date: '2024-03-16', squat: 300 }]);
  });
});

describe('latestLiftE1RMs', () => {
  it.each([
    ['empty data', [], {}],
    ['single lift type', [point(1000, { squat: 300 })], { squat: 300 }],
    [
      'forward-fills last value',
      [
        point(1000, { squat: 300 }),
        point(2000, { squat: 310, bench: 200 }),
        point(3000, { deadlift: 450 }),
      ],
      { squat: 310, bench: 200, deadlift: 450 },
    ],
    [
      'only includes defined',
      [point(1000, { bench: 200, deadlift: 400 })],
      { bench: 200, deadlift: 400 },
    ],
    [
      'picks latest across points',
      [
        point(1000, { squat: 280, bench: 180 }),
        point(2000, { squat: 300 }),
        point(3000, { bench: 200, deadlift: 450 }),
      ],
      { squat: 300, bench: 200, deadlift: 450 },
    ],
    [
      'includes total with other fields',
      [
        point(1000, { squat: 300, bench: 200, deadlift: 450, total: 950 }),
        point(2000, { total: 960 }),
      ],
      { squat: 300, bench: 200, deadlift: 450, total: 960 },
    ],
  ])('%s', (_, data, expected) => {
    expect(latestLiftE1RMs(data)).toEqual(expected);
  });
});

describe('mergeRechartsRowsToChartPoints', () => {
  it.each([
    [
      'merges sharing timestamps & converts kg to lbs',
      { squat: [row(1000, 'squat', 100.4)], bench: [row(1000, 'bench', 80.6)] },
      ['squat', 'bench'],
      'lbs' as const,
      [{ date: new Date(1000).toISOString(), squat: 221, bench: 178 }],
    ],
    [
      'leaves missing columns unset',
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
      'sorts input rows ascending by date',
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
      'keeps original values when unit is kg',
      { squat: [row(1000, 'squat', 100.4)] },
      ['squat'],
      'kg' as const,
      [{ date: new Date(1000).toISOString(), squat: 100 }],
    ],
  ])('%s', (_, datasets, ids, unit, expected) => {
    expect(mergeRechartsRowsToChartPoints(datasets, ids, unit)).toEqual(expected);
  });

  it('omits explicit undefined keys', () => {
    const [p] = mergeRechartsRowsToChartPoints(
      { squat: [row(1000, 'squat', 100)] },
      ['squat'],
      'kg'
    );
    expect(Object.keys(p).sort()).toEqual(['date', 'squat']);
  });
});

describe('mergeWideRechartsRows', () => {
  it.each([
    [
      'copies all non-t columns',
      [{ t: 1000, box: 100, ssb: 90 }],
      'kg' as const,
      [{ date: new Date(1000).toISOString(), box: 100, ssb: 90 }],
    ],
    [
      'copies only date for empty row',
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
