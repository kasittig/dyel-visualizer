import { describe, expect, it } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildWeeklyAccessoryCategoryExposure } from './weeklyAccessoryExposure';

const at = (year: number, month: number, day: number, hour = 0) =>
  Date.UTC(year, month - 1, day, hour);
const record = (
  exercise: string,
  date: number,
  overrides: Partial<TaggedSetRecord> = {}
): TaggedSetRecord => ({
  date,
  exercise,
  canonical: exercise.toLowerCase().replaceAll(' ', '-'),
  weight: 10,
  reps: 10,
  rpe: 8,
  effects: [],
  baselineRange: null,
  meta: { rawExercise: exercise },
  tags: new Set(['lift:accessory']),
  ...overrides,
});

describe('buildWeeklyAccessoryCategoryExposure', () => {
  it.each([
    ['empty input', [], []],
    [
      'same-day sets and exercises count once per category',
      [
        record('Lat Pulldown', at(2026, 8, 3, 8)),
        record('Lat Pulldown', at(2026, 8, 3, 18)),
        record('Chest Supported Row', at(2026, 8, 3, 20)),
        record('Row', at(2026, 8, 4)),
      ],
      [{ weekStart: at(2026, 8, 3), category: 'upper-pull', sessionCount: 2 }],
    ],
    [
      'categories count independently and use taxonomy order',
      [record('Plank', at(2026, 8, 4)), record('Lat Pulldown', at(2026, 8, 4))],
      [
        { weekStart: at(2026, 8, 3), category: 'upper-pull', sessionCount: 1 },
        { weekStart: at(2026, 8, 3), category: 'core', sessionCount: 1 },
      ],
    ],
    [
      'Sunday and Monday cross the UTC week boundary',
      [record('Plank', at(2026, 8, 9, 23)), record('Plank', at(2026, 8, 10))],
      [
        { weekStart: at(2026, 8, 3), category: 'core', sessionCount: 1 },
        { weekStart: at(2026, 8, 10), category: 'core', sessionCount: 1 },
      ],
    ],
    [
      'week start crosses the calendar-year boundary',
      [record('Plank', at(2026, 1, 1)), record('Plank', at(2026, 1, 5))],
      [
        { weekStart: at(2025, 12, 29), category: 'core', sessionCount: 1 },
        { weekStart: at(2026, 1, 5), category: 'core', sessionCount: 1 },
      ],
    ],
    [
      'zero load and missing RPE still count',
      [record('Plank', at(2026, 8, 3), { weight: 0, rpe: null })],
      [{ weekStart: at(2026, 8, 3), category: 'core', sessionCount: 1 }],
    ],
    [
      'unclassified accessories and primary lifts are excluded',
      [
        record('Mystery Movement', at(2026, 8, 3)),
        record('Lat Pulldown', at(2026, 8, 3), { tags: new Set(['lift:bench']) }),
      ],
      [],
    ],
  ])('%s', (_, records, expected) => {
    expect(buildWeeklyAccessoryCategoryExposure(records)).toEqual(
      expected.map((point) => expect.objectContaining(point))
    );
  });

  it('retains sorted distinct training dates for exact downstream window clipping', () => {
    expect(
      buildWeeklyAccessoryCategoryExposure([
        record('Plank', at(2026, 8, 5, 20)),
        record('Plank', at(2026, 8, 3, 8)),
        record('Plank', at(2026, 8, 5, 8)),
      ])[0].sessionDates
    ).toEqual([at(2026, 8, 3), at(2026, 8, 5)]);
  });

  it('honors explicit user taxonomy mappings', () => {
    expect(
      buildWeeklyAccessoryCategoryExposure([record('Mystery Movement', at(2026, 8, 3))], {
        'mystery-movement': 'glutes',
      })
    ).toEqual([
      {
        weekStart: at(2026, 8, 3),
        category: 'glutes',
        sessionCount: 1,
        sessionDates: [at(2026, 8, 3)],
      },
    ]);
  });
});
