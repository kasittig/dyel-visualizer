import { describe, it, expect } from 'vitest';
import { buildCanonicalByLabel, resolveTargetLabel } from './variationRadarSelectors';
import type { TaggedSetRecord } from '@dyel/pipeline';

const createRecord = (overrides?: Partial<TaggedSetRecord>): TaggedSetRecord => ({
  date: 1000,
  canonical: 'canonical1',
  exercise: 'exercise1',
  tags: new Set(['lift:squat']),
  sets: 1,
  reps: 1,
  weight: 100,
  unit: 'kg',
  meta: {},
  ...overrides,
});

describe('buildCanonicalByLabel', () => {
  it.each([
    ['empty input', [], 'squat', new Map()],
    [
      'single matching record',
      [createRecord({ canonical: 'bench_press', tags: new Set(['lift:bench']) })],
      'bench',
      new Map([['bench_press', 'bench_press']]),
    ],
    [
      'multiple records same label picks latest date',
      [
        createRecord({
          canonical: 'bench1',
          date: 100,
          meta: { rawExercise: 'Bench' },
          tags: new Set(['lift:bench']),
        }),
        createRecord({
          canonical: 'bench2',
          date: 200,
          meta: { rawExercise: 'Bench' },
          tags: new Set(['lift:bench']),
        }),
      ],
      'bench',
      new Map([['Bench', 'bench2']]),
    ],
    [
      'records for different lift type excluded',
      [
        createRecord({ canonical: 'bench_press', tags: new Set(['lift:bench']) }),
        createRecord({ canonical: 'squat_hs', tags: new Set(['lift:squat']) }),
      ],
      'bench',
      new Map([['bench_press', 'bench_press']]),
    ],
    [
      'multiple labels tracked separately',
      [
        createRecord({
          canonical: 'bench1',
          date: 100,
          meta: { rawExercise: 'DB Bench' },
          tags: new Set(['lift:bench']),
        }),
        createRecord({
          canonical: 'press1',
          date: 150,
          meta: { rawExercise: 'OHP' },
          tags: new Set(['lift:bench']),
        }),
      ],
      'bench',
      new Map([
        ['DB Bench', 'bench1'],
        ['OHP', 'press1'],
      ]),
    ],
  ])('buildCanonicalByLabel: %s', (_, tagged, liftType, expected) => {
    const result = buildCanonicalByLabel(tagged, liftType);
    expect(result).toEqual(expected);
  });
});

describe('resolveTargetLabel', () => {
  it.each([
    ['empty input', [], 'squat', 'squat', undefined],
    [
      'single matching record',
      [createRecord({ canonical: 'bench_press', tags: new Set(['lift:bench']) })],
      'bench',
      'bench_press',
      'bench_press',
    ],
    [
      'multiple records same canonical picks latest date',
      [
        createRecord({
          canonical: 'squat',
          date: 100,
          meta: { rawExercise: 'Squat v1' },
          tags: new Set(['lift:squat']),
        }),
        createRecord({
          canonical: 'squat',
          date: 200,
          meta: { rawExercise: 'Squat v2' },
          tags: new Set(['lift:squat']),
        }),
      ],
      'squat',
      'squat',
      'Squat v2',
    ],
    [
      'no match for given targetCanonical',
      [
        createRecord({ canonical: 'bench_press', tags: new Set(['lift:bench']) }),
        createRecord({ canonical: 'dumbbell_press', tags: new Set(['lift:bench']) }),
      ],
      'bench',
      'squat',
      undefined,
    ],
    [
      'records for different lift type excluded',
      [
        createRecord({ canonical: 'squat', tags: new Set(['lift:squat']) }),
        createRecord({ canonical: 'bench_press', tags: new Set(['lift:bench']) }),
      ],
      'bench',
      'bench_press',
      'bench_press',
    ],
    [
      'uses rawExercise when available',
      [
        createRecord({
          canonical: 'bench',
          date: 100,
          meta: { rawExercise: 'Custom Bench' },
          tags: new Set(['lift:bench']),
        }),
      ],
      'bench',
      'bench',
      'Custom Bench',
    ],
  ])('resolveTargetLabel: %s', (_, tagged, liftType, targetCanonical, expected) => {
    const result = resolveTargetLabel(tagged, liftType, targetCanonical);
    expect(result).toBe(expected);
  });
});
