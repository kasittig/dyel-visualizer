import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildBestSetByLabelAndDate, type BestSet } from './conjugateBestSet';

const record = (
  date: Date,
  canonical: string,
  reps: number,
  weight: number,
  rpe?: number,
  opts: { rawExercise?: string; sets?: string; liftType?: string } = {}
): TaggedSetRecord => ({
  date: date.getTime(),
  exercise: canonical,
  weight,
  reps,
  rpe,
  canonical,
  tags: new Set([`lift:${opts.liftType ?? 'bench'}`, 'comp-lift']),
  effects: [],
  baselineRange: null,
  meta:
    opts.rawExercise || opts.sets
      ? {
          ...(opts.rawExercise && { rawExercise: opts.rawExercise }),
          ...(opts.sets && { sets: opts.sets }),
        }
      : undefined,
});

describe('buildBestSetByLabelAndDate', () => {
  const day = new Date('2026-01-15');
  const dStr = day.toISOString();

  it.each([
    ['empty input', [], new Map()],
    [
      'single effort set',
      [record(day, 'bench', 5, 100, 8)],
      new Map([['bench', new Map([[dStr, { sets: 1, reps: 5, weight: 100, rpe: 8 }]])]]),
    ],
    [
      'picks highest-e1RM set',
      [record(day, 'bench', 5, 90, 8), record(day, 'bench', 3, 100, 9)],
      new Map([['bench', new Map([[dStr, { sets: 2, reps: 3, weight: 100, rpe: 9 }]])]]),
    ],
    [
      'excludes speed-work days',
      [
        record(day, 'bench', 3, 85, undefined, { sets: '9' }),
        record(day, 'bench', 3, 85, undefined, { sets: '9' }),
      ],
      new Map(),
    ],
    [
      'rpe optional -> null',
      [record(day, 'bench', 5, 100)],
      new Map([['bench', new Map([[dStr, { sets: 1, reps: 5, weight: 100, rpe: null }]])]]),
    ],
    [
      'rawExercise as label',
      [record(day, 'bench', 5, 100, 8, { rawExercise: 'Bench (Competition)' })],
      new Map([
        ['Bench (Competition)', new Map([[dStr, { sets: 1, reps: 5, weight: 100, rpe: 8 }]])],
      ]),
    ],
  ])('%s', (_, input, expected: Map<string, Map<string, BestSet>>) => {
    expect(buildBestSetByLabelAndDate(input, 'bench')).toEqual(expected);
  });

  it('filters by lift type tag', () => {
    const res = buildBestSetByLabelAndDate(
      [
        record(day, 'squat', 5, 150, 8, { liftType: 'squat' }),
        record(day, 'bench', 5, 100, 8, { liftType: 'bench' }),
      ],
      'bench'
    );
    expect(res.size).toBe(1);
    expect(res.has('bench')).toBe(true);
  });

  it('derives sets count from record count when meta.sets is absent', () => {
    const res = buildBestSetByLabelAndDate(
      [record(day, 'bench', 5, 100, 8), record(day, 'bench', 5, 100, 8)],
      'bench'
    );
    expect(res.get('bench')?.get(dStr)?.sets).toBe(2);
  });
});
