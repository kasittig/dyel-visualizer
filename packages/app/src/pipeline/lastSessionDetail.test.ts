import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildLastSessionDetail, type LastSessionDetail } from './lastSessionDetail';

// Helper to build synthetic tagged records for testing
const record = (
  date: Date,
  canonical: string,
  reps: number,
  weight: number,
  rpe?: number,
  rawExercise?: string
): TaggedSetRecord => ({
  date: date.getTime(),
  exercise: canonical,
  weight,
  reps,
  rpe,
  canonical,
  tags: new Set(['lift:bench', 'comp-lift']),
  effects: [],
  meta: rawExercise ? { rawExercise } : undefined,
});

describe('buildLastSessionDetail', () => {
  const now = new Date('2026-01-15');
  const yesterday = new Date('2026-01-14');
  const twoDaysAgo = new Date('2026-01-13');

  it.each([
    ['empty input', [], new Map()],
    [
      'single record',
      [record(now, 'bench', 5, 100, 8)],
      new Map([['bench', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }]]),
    ],
    [
      'multiple records same date/label→aggregated sets count (no meta.sets)',
      [
        record(now, 'bench', 5, 100, 8),
        record(now, 'bench', 5, 100, 8),
        record(now, 'bench', 3, 80, 6),
      ],
      new Map([['bench', { date: '2026-01-15', sets: 3, reps: 5, weight: 100, rpe: 8 }]]),
    ],
    [
      'multiple labels same date→separate entries',
      [
        record(now, 'bench', 5, 100, 8, 'Bench Press'),
        record(now, 'bench-comp', 3, 80, 6, 'Bench (CG)'),
      ],
      new Map([
        ['Bench Press', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }],
        ['Bench (CG)', { date: '2026-01-15', sets: 1, reps: 3, weight: 80, rpe: 6 }],
      ]),
    ],
    [
      'multiple dates same label→picks most recent',
      [
        record(twoDaysAgo, 'bench', 5, 95, 7),
        record(yesterday, 'bench', 5, 98, 7.5),
        record(now, 'bench', 5, 100, 8),
      ],
      new Map([['bench', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }]]),
    ],
    [
      'rpe optional→null when absent',
      [record(now, 'bench', 5, 100)],
      new Map([['bench', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: null }]]),
    ],
    [
      'rawExercise used as label when present',
      [record(now, 'bench', 5, 100, 8, 'Bench (Competition)')],
      new Map([
        ['Bench (Competition)', { date: '2026-01-15', sets: 1, reps: 5, weight: 100, rpe: 8 }],
      ]),
    ],
  ])('%s', (_, input: TaggedSetRecord[], expected: Map<string, LastSessionDetail>) => {
    const result = buildLastSessionDetail(input, 'bench');
    expect(result).toEqual(expected);
  });

  it('filters by lift type tag', () => {
    const squat: TaggedSetRecord = {
      date: now.getTime(),
      exercise: 'squat',
      weight: 100,
      reps: 5,
      rpe: 8,
      canonical: 'squat',
      tags: new Set(['lift:squat', 'comp-lift']),
      effects: [],
    };
    const bench: TaggedSetRecord = {
      date: now.getTime(),
      exercise: 'bench',
      weight: 100,
      reps: 5,
      rpe: 8,
      canonical: 'bench',
      tags: new Set(['lift:bench', 'comp-lift']),
      effects: [],
    };

    const result = buildLastSessionDetail([squat, bench], 'bench');
    expect(result.size).toBe(1);
    expect(result.has('bench')).toBe(true);
    expect(result.has('squat')).toBe(false);
  });

  it('returns correctly formatted date string (YYYY-MM-DD)', () => {
    const records = [
      {
        date: new Date('2026-07-08').getTime(),
        exercise: 'bench',
        weight: 100,
        reps: 5,
        rpe: 8,
        canonical: 'bench',
        tags: new Set(['lift:bench', 'comp-lift']),
        effects: [],
      } as TaggedSetRecord,
    ];

    const result = buildLastSessionDetail(records, 'bench');
    const detail = result.get('bench');
    expect(detail?.date).toBe('2026-07-08');
  });
});
