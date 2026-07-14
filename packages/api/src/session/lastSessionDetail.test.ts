import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import {
  buildLastSessionDetail,
  buildLastSessionDetailForCanonical,
  formatLastSessionSummary,
  type LastSessionDetail,
} from './lastSessionDetail';

const rec = (
  d: Date,
  canonical: string,
  reps: number,
  weight: number,
  rpe?: number,
  rawExercise?: string,
  lift = 'bench'
): TaggedSetRecord => ({
  date: d.getTime(),
  exercise: canonical,
  weight,
  reps,
  rpe,
  canonical,
  tags: new Set([`lift:${lift}`, 'comp-lift']),
  effects: [],
  baselineRange: null,
  meta: rawExercise ? { rawExercise } : undefined,
});

describe('buildLastSessionDetail', () => {
  const now = new Date(2026, 0, 15);
  const yest = new Date(2026, 0, 14);
  const twoDays = new Date(2026, 0, 13);

  it.each([
    ['empty input', [], new Map()],
    [
      'single record',
      [rec(now, 'bench', 5, 100, 8)],
      new Map([['bench', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }]]),
    ],
    [
      'aggregates sets count',
      [rec(now, 'bench', 5, 100, 8), rec(now, 'bench', 5, 100, 8), rec(now, 'bench', 3, 80, 6)],
      new Map([['bench', { date: '2026-01-15', sets: 3, reps: 5, weight: 100, rpe: 8 }]]),
    ],
    [
      'separate labels same date',
      [rec(now, 'bench', 5, 100, 8, 'Bench Press'), rec(now, 'bench-comp', 3, 80, 6, 'Bench (CG)')],
      new Map([
        ['Bench Press', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }],
        ['Bench (CG)', { date: '2026-01-15', sets: 1, reps: 3, weight: 80, rpe: 6 }],
      ]),
    ],
    [
      'picks most recent date',
      [
        rec(twoDays, 'bench', 5, 95, 7),
        rec(yest, 'bench', 5, 98, 7.5),
        rec(now, 'bench', 5, 100, 8),
      ],
      new Map([['bench', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }]]),
    ],
    [
      'optional rpe to null',
      [rec(now, 'bench', 5, 100)],
      new Map([['bench', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: null }]]),
    ],
    [
      'rawExercise used as label',
      [rec(now, 'bench', 5, 100, 8, 'Bench (Comp)')],
      new Map([['Bench (Comp)', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }]]),
    ],
  ])('%s', (_, input, expected: Map<string, LastSessionDetail>) => {
    expect(buildLastSessionDetail(input, 'bench')).toEqual(expected);
  });

  it('filters by lift type tag and formats date to YYYY-MM-DD', () => {
    const res = buildLastSessionDetail(
      [
        rec(now, 'squat', 5, 100, 8, undefined, 'squat'),
        rec(new Date(2026, 6, 8), 'bench', 5, 100, 8),
      ],
      'bench'
    );
    expect(res.size).toBe(1);
    if (!res.has('bench')) {
      throw new Error('Missing expected bench entry');
    }
    expect(res.get('bench')?.date).toBe('2026-07-08');
  });

  it('formats local-constructed dates correctly (catches timezone bugs)', () => {
    const localDate = new Date(2026, 6, 8);
    const expectedDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    const res = buildLastSessionDetail([rec(localDate, 'bench', 5, 100, 8)], 'bench');
    if (!res.has('bench')) {
      throw new Error('Missing expected bench entry');
    }
    expect(res.get('bench')?.date).toBe(expectedDate);
  });
});

describe('buildLastSessionDetailForCanonical', () => {
  const now = new Date(2026, 4, 3);
  const yest = new Date(2026, 4, 2);
  const twoDays = new Date(2026, 4, 1);

  it.each([
    ['empty input', [], 'bench', null],
    ['no matching canonical', [rec(now, 'squat', 5, 100, 8)], 'bench', null],
    [
      'single record',
      [rec(now, 'bench', 5, 100, 8)],
      'bench',
      { date: '2026-05-03', sets: 1, reps: 5, weight: 100, rpe: 8 },
    ],
    [
      'picks most recent date among multiple',
      [
        rec(twoDays, 'bench', 5, 95, 7),
        rec(yest, 'bench', 5, 98, 7.5),
        rec(now, 'bench', 5, 100, 8),
      ],
      'bench',
      { date: '2026-05-03', sets: 1, reps: 5, weight: 100, rpe: 8 },
    ],
    [
      'optional rpe to null',
      [rec(now, 'bench', 5, 100)],
      'bench',
      { date: '2026-05-03', sets: 1, reps: 5, weight: 100, rpe: null },
    ],
    [
      'aggregates sets count',
      [rec(now, 'bench', 5, 100, 8), rec(now, 'bench', 5, 100, 8), rec(now, 'bench', 3, 80, 6)],
      'bench',
      { date: '2026-05-03', sets: 3, reps: 5, weight: 100, rpe: 8 },
    ],
  ])('%s', (_, input, canonical, expected) => {
    expect(buildLastSessionDetailForCanonical(input, canonical)).toEqual(expected);
  });
});

describe('formatLastSessionSummary', () => {
  it.each([
    [
      'standard format with lbs',
      { date: '2026-05-03', sets: 1, reps: 3, weight: 111, rpe: 8 },
      'lbs',
      '5/3 (1x3 @ 245 lbs)',
    ],
    [
      'single-digit month and day',
      { date: '2026-01-05', sets: 2, reps: 5, weight: 100, rpe: null },
      'lbs',
      '1/5 (2x5 @ 220 lbs)',
    ],
    [
      'double-digit month and day',
      { date: '2026-11-25', sets: 3, reps: 1, weight: 136, rpe: 9 },
      'lbs',
      '11/25 (3x1 @ 300 lbs)',
    ],
    [
      'kg unit',
      { date: '2026-05-03', sets: 1, reps: 3, weight: 111, rpe: 8 },
      'kg',
      '5/3 (1x3 @ 111 kg)',
    ],
  ])('%s', (_, detail, unit, expected) => {
    expect(formatLastSessionSummary(detail, unit)).toBe(expected);
  });
});
