import { describe, it, expect } from 'vitest';
import { compareChartSeries } from './compareChartSeries';
import type { ChartPoint } from '@dyel/core';

describe('compareChartSeries', () => {
  it.each<[string, ChartPoint[], string, Partial<ReturnType<typeof compareChartSeries>>]>([
    [
      'empty data returns zero-value result',
      [],
      'squat',
      { count: 0, min: 0, max: 0, range: 0, ratio: 0, values: [] },
    ],
    [
      'series not present in any points returns empty result',
      [
        { date: '2026-01-01T00:00:00Z', bench: 300 },
        { date: '2026-01-02T00:00:00Z', bench: 320 },
      ],
      'squat',
      { count: 0, min: 0, max: 0, range: 0, ratio: 0, values: [] },
    ],
    [
      'single point with series returns ratio of 1',
      [{ date: '2026-01-01T00:00:00Z', squat: 300 }],
      'squat',
      { count: 1, min: 300, max: 300, range: 0, ratio: 1, values: [300] },
    ],
    [
      'filters points without series and returns only those with it',
      [
        { date: '2026-01-01T00:00:00Z', squat: 300 },
        { date: '2026-01-02T00:00:00Z', bench: 250 },
        { date: '2026-01-03T00:00:00Z', squat: 350 },
      ],
      'squat',
      { count: 2, min: 300, max: 350, range: 50, ratio: 1.1666666666666667, values: [300, 350] },
    ],
    [
      'calculates ratio correctly for multi-value series',
      [
        { date: '2026-01-01T00:00:00Z', squat: 100 },
        { date: '2026-01-02T00:00:00Z', squat: 200 },
        { date: '2026-01-03T00:00:00Z', squat: 300 },
      ],
      'squat',
      { count: 3, min: 100, max: 300, range: 200, ratio: 3, values: [100, 200, 300] },
    ],
    [
      'ignores points with undefined series value',
      [
        { date: '2026-01-01T00:00:00Z', squat: 300 },
        { date: '2026-01-02T00:00:00Z', squat: undefined },
        { date: '2026-01-03T00:00:00Z', squat: 350 },
      ],
      'squat',
      { count: 2, min: 300, max: 350, range: 50, ratio: 1.1666666666666667, values: [300, 350] },
    ],
    [
      'preserves order of values from original data',
      [
        { date: '2026-01-01T00:00:00Z', squat: 350 },
        { date: '2026-01-02T00:00:00Z', squat: 300 },
        { date: '2026-01-03T00:00:00Z', squat: 325 },
      ],
      'squat',
      {
        count: 3,
        min: 300,
        max: 350,
        range: 50,
        ratio: 1.1666666666666667,
        values: [350, 300, 325],
      },
    ],
    [
      'handles realistic powerlifting variation range',
      [
        { date: '2026-01-01T00:00:00Z', deadlift: 405 },
        { date: '2026-01-15T00:00:00Z', deadlift: 415 },
        { date: '2026-02-01T00:00:00Z', deadlift: 425 },
        { date: '2026-03-01T00:00:00Z', deadlift: 500 },
        { date: '2026-04-01T00:00:00Z', deadlift: 510 },
      ],
      'deadlift',
      {
        count: 5,
        min: 405,
        max: 510,
        range: 105,
        ratio: 1.2592592592592593,
        values: [405, 415, 425, 500, 510],
      },
    ],
    [
      'filters to series and collects values correctly',
      [
        { date: '2026-01-01T00:00:00Z', squat: 300, bench: 250 },
        { date: '2026-01-02T00:00:00Z', deadlift: 400 },
        { date: '2026-01-03T00:00:00Z', squat: 350, bench: 275 },
      ],
      'squat',
      { count: 2, min: 300, max: 350, range: 50, ratio: 1.1666666666666667, values: [300, 350] },
    ],
  ])('%s', (_, data, seriesName, expected) => {
    const result = compareChartSeries(data, seriesName);
    expect(result.count).toBe(expected.count);
    expect(result.min).toBe(expected.min);
    expect(result.max).toBe(expected.max);
    expect(result.range).toBe(expected.range);
    expect(result.ratio).toBe(expected.ratio);
    expect(result.values).toEqual(expected.values);
    expect(result.seriesName).toBe(seriesName);
  });

  it('series name matches the requested series', () => {
    const result = compareChartSeries([{ date: '2026-01-01T00:00:00Z', squat: 300 }], 'squat');
    expect(result.seriesName).toBe('squat');
  });

  it('pointsWithSeries contains all points with defined series values', () => {
    const data = [
      { date: '2026-01-01T00:00:00Z', squat: 300, bench: 250 },
      { date: '2026-01-02T00:00:00Z', deadlift: 400 },
      { date: '2026-01-03T00:00:00Z', squat: 350, bench: 275 },
    ];
    const result = compareChartSeries(data, 'squat');

    expect(result.pointsWithSeries).toEqual([
      { date: '2026-01-01T00:00:00Z', squat: 300, bench: 250 },
      { date: '2026-01-03T00:00:00Z', squat: 350, bench: 275 },
    ]);
  });

  it('returns structured result with all expected fields', () => {
    const result = compareChartSeries(
      [
        { date: '2026-01-01T00:00:00Z', squat: 300 },
        { date: '2026-01-02T00:00:00Z', squat: 350 },
      ],
      'squat'
    );

    expect(result).toHaveProperty('seriesName');
    expect(result).toHaveProperty('pointsWithSeries');
    expect(result).toHaveProperty('count');
    expect(result).toHaveProperty('values');
    expect(result).toHaveProperty('min');
    expect(result).toHaveProperty('max');
    expect(result).toHaveProperty('range');
    expect(result).toHaveProperty('ratio');
  });
});
