import { describe, it, expect } from 'vitest';
import type { ChartPoint } from '@dyel/core';
import { joinChartPointsByDate, diffSeries } from './diffChartSeries';

// Set timezone to ensure regression tests for bare YYYY-MM-DD date handling are deterministic.
// Negative-offset timezones (like America/New_York) expose the bug: bare '2026-02-02' is parsed
// as UTC midnight, becoming 2026-02-01T19:00:00 EST instead of local 2026-02-02.
process.env.TZ = 'America/New_York';

describe('joinChartPointsByDate', () => {
  it.each<[string, ChartPoint[], ChartPoint[], ReturnType<typeof joinChartPointsByDate>]>([
    ['both arrays empty returns empty result', [], [], []],
    [
      'only a has points returns all with a set and b undefined',
      [{ date: '2026-01-01T00:00:00', squat: 300 }],
      [],
      [{ dateKey: '2026-01-01', a: { date: '2026-01-01T00:00:00', squat: 300 } }],
    ],
    [
      'only b has points returns all with b set and a undefined',
      [],
      [{ date: '2026-01-02T00:00:00', bench: 250 }],
      [{ dateKey: '2026-01-02', b: { date: '2026-01-02T00:00:00', bench: 250 } }],
    ],
    [
      'points from a and b on same local date but different formats join into single row',
      [{ date: '2026-01-15T00:00:00', squat: 300 }],
      [{ date: '2026-01-15T12:30:45.000Z', bench: 250 }],
      [
        {
          dateKey: '2026-01-15',
          a: { date: '2026-01-15T00:00:00', squat: 300 },
          b: { date: '2026-01-15T12:30:45.000Z', bench: 250 },
        },
      ],
    ],
    [
      'points from a and b on different dates produce separate rows',
      [{ date: '2026-01-01T00:00:00', squat: 300 }],
      [{ date: '2026-01-02T00:00:00', bench: 250 }],
      [
        { dateKey: '2026-01-01', a: { date: '2026-01-01T00:00:00', squat: 300 } },
        { dateKey: '2026-01-02', b: { date: '2026-01-02T00:00:00', bench: 250 } },
      ],
    ],
    [
      'multiple points from a on same local date last-write-wins',
      [
        { date: '2026-01-01T08:00:00', squat: 300 },
        { date: '2026-01-01T18:00:00', squat: 310 },
      ],
      [],
      [{ dateKey: '2026-01-01', a: { date: '2026-01-01T18:00:00', squat: 310 } }],
    ],
    [
      'multiple points from b on same local date last-write-wins',
      [],
      [
        { date: '2026-01-05T08:00:00', bench: 250 },
        { date: '2026-01-05T20:00:00', bench: 270 },
      ],
      [{ dateKey: '2026-01-05', b: { date: '2026-01-05T20:00:00', bench: 270 } }],
    ],
    [
      'result rows sorted ascending by dateKey',
      [
        { date: '2026-01-05T00:00:00', squat: 400 },
        { date: '2026-01-01T00:00:00', squat: 300 },
        { date: '2026-01-10T00:00:00', squat: 350 },
      ],
      [],
      [
        { dateKey: '2026-01-01', a: { date: '2026-01-01T00:00:00', squat: 300 } },
        { dateKey: '2026-01-05', a: { date: '2026-01-05T00:00:00', squat: 400 } },
        { dateKey: '2026-01-10', a: { date: '2026-01-10T00:00:00', squat: 350 } },
      ],
    ],
    [
      'bare YYYY-MM-DD date and UTC ISO instant for same local calendar day join into single row',
      [{ date: '2026-02-02', squat: 300 }],
      [{ date: '2026-02-02T05:00:00.000Z', bench: 250 }],
      [
        {
          dateKey: '2026-02-02',
          a: { date: '2026-02-02', squat: 300 },
          b: { date: '2026-02-02T05:00:00.000Z', bench: 250 },
        },
      ],
    ],
    [
      'bare YYYY-MM-DD date and UTC ISO instant for different local calendar days produce separate rows',
      [{ date: '2026-02-02', squat: 300 }],
      [{ date: '2026-02-03T05:00:00.000Z', bench: 250 }],
      [
        { dateKey: '2026-02-02', a: { date: '2026-02-02', squat: 300 } },
        { dateKey: '2026-02-03', b: { date: '2026-02-03T05:00:00.000Z', bench: 250 } },
      ],
    ],
  ])('%s', (_, a, b, expected) => {
    expect(joinChartPointsByDate(a, b)).toEqual(expected);
  });
});

describe('diffSeries', () => {
  it.each<
    [string, ReturnType<typeof joinChartPointsByDate>, string, ReturnType<typeof diffSeries>]
  >([
    [
      'empty joined array returns zero-value result',
      [],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 0,
        missingInA: 0,
        missingInB: 0,
        maxAbsDiff: 0,
        maxRelDiff: 0,
      },
    ],
    [
      'series present on both sides increments comparedCount and tracks diffs',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', squat: 320 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 1,
        missingInA: 0,
        missingInB: 0,
        maxAbsDiff: 20,
        maxRelDiff: 20 / 320,
      },
    ],
    [
      'series only in a increments missingInB',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', bench: 250 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 0,
        missingInA: 0,
        missingInB: 1,
        maxAbsDiff: 0,
        maxRelDiff: 0,
      },
    ],
    [
      'series only in b increments missingInA',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', bench: 250 },
          b: { date: '2026-01-01', squat: 300 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 0,
        missingInA: 1,
        missingInB: 0,
        maxAbsDiff: 0,
        maxRelDiff: 0,
      },
    ],
    [
      'series present on neither side leaves all counters at zero',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', bench: 250 },
          b: { date: '2026-01-01', deadlift: 400 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 0,
        missingInA: 0,
        missingInB: 0,
        maxAbsDiff: 0,
        maxRelDiff: 0,
      },
    ],
    [
      'multiple rows maxAbsDiff tracks maximum across all rows',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', squat: 310 },
        },
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', squat: 320 },
          b: { date: '2026-01-02', squat: 335 },
        },
        {
          dateKey: '2026-01-03',
          a: { date: '2026-01-03', squat: 350 },
          b: { date: '2026-01-03', squat: 352 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 3,
        missingInA: 0,
        missingInB: 0,
        maxAbsDiff: 15,
        maxRelDiff: 15 / 335,
      },
    ],
    [
      'both values are 0 relDiff is 0 not NaN',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 0 },
          b: { date: '2026-01-01', squat: 0 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 1,
        missingInA: 0,
        missingInB: 0,
        maxAbsDiff: 0,
        maxRelDiff: 0,
      },
    ],
    [
      'series not present anywhere leaves all counts at zero',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', bench: 250 },
          b: { date: '2026-01-01', bench: 260 },
        },
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', deadlift: 400 },
          b: { date: '2026-01-02', deadlift: 420 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 0,
        missingInA: 0,
        missingInB: 0,
        maxAbsDiff: 0,
        maxRelDiff: 0,
      },
    ],
    [
      'mixed rows some compared some missing',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', squat: 310 },
        },
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', squat: 320 },
          b: { date: '2026-01-02', bench: 250 },
        },
        {
          dateKey: '2026-01-03',
          a: { date: '2026-01-03', bench: 250 },
          b: { date: '2026-01-03', squat: 340 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 1,
        missingInA: 1,
        missingInB: 1,
        maxAbsDiff: 10,
        maxRelDiff: 10 / 310,
      },
    ],
    [
      'maxRelDiff tracks maximum relative difference',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 100 },
          b: { date: '2026-01-01', squat: 110 },
        },
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', squat: 1000 },
          b: { date: '2026-01-02', squat: 1005 },
        },
      ],
      'squat',
      {
        seriesName: 'squat',
        comparedCount: 2,
        missingInA: 0,
        missingInB: 0,
        maxAbsDiff: 10,
        maxRelDiff: 10 / 110,
      },
    ],
  ])('%s', (_, joined, seriesName, expected) => {
    const result = diffSeries(joined, seriesName);
    expect(result.seriesName).toBe(expected.seriesName);
    expect(result.comparedCount).toBe(expected.comparedCount);
    expect(result.missingInA).toBe(expected.missingInA);
    expect(result.missingInB).toBe(expected.missingInB);
    expect(result.maxAbsDiff).toBe(expected.maxAbsDiff);
    expect(result.maxRelDiff).toBe(expected.maxRelDiff);
  });
});
