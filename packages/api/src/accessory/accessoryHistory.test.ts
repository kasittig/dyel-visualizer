import { describe, expect, it } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildAccessoryHistory, selectAccessoryHistoryMetric } from './accessoryHistory';

const rec = (date: number, weight: number, reps: number, sets = 1): TaggedSetRecord => ({
  date,
  weight,
  reps,
  sets,
  exercise: 'row',
  canonical: 'row',
  tags: new Set(['lift:accessory']),
  effects: [],
  baselineRange: null,
  meta: { rawExercise: 'Row' },
});

describe('accessory history', () => {
  it.each([
    ['consistent weighted work uses load', [rec(1, 40, 10), rec(2, 45, 10)], 'load'],
    ['changing weighted schemes use volume', [rec(1, 40, 10), rec(2, 45, 8)], 'volume'],
    ['zero-load work uses reps', [rec(1, 0, 10), rec(2, 0, 12)], 'reps'],
    ['mixed load history uses reps', [rec(1, 0, 10), rec(2, 20, 10)], 'reps'],
  ])('%s', (_, records, expected) => {
    expect(selectAccessoryHistoryMetric(records)).toBe(expected);
  });

  it('builds one selected exercise only and filters the requested date range', () => {
    const jan1 = new Date(2026, 0, 1).getTime();
    const jan2 = new Date(2026, 0, 2).getTime();
    const other = { ...rec(jan2, 100, 10), canonical: 'curl', exercise: 'curl' };

    expect(
      buildAccessoryHistory(
        [rec(jan1, 40, 10), rec(jan2, 45, 10), other],
        'canonical:row',
        'kg',
        new Date(2026, 0, 2),
        new Date(2026, 0, 2)
      )
    ).toMatchObject({
      metric: 'load',
      metricLabel: 'Best load',
      unitLabel: 'kg',
      data: [{ value: 45 }],
    });
  });

  it('returns an honest empty range while preserving the selected metric', () => {
    expect(
      buildAccessoryHistory(
        [rec(new Date(2026, 0, 1).getTime(), 0, 12, 3)],
        'canonical:row',
        'lbs',
        new Date(2026, 1, 1),
        new Date(2026, 1, 2)
      )
    ).toMatchObject({ metric: 'reps', unitLabel: 'reps', data: [] });
  });
});
