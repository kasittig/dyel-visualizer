import { describe, expect, it } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildAccessoryCoverage, classifyAccessory } from './accessoryCoverage';

const rec = (
  exercise: string,
  date = new Date(2026, 0, 15).getTime(),
  weight = 10,
  reps = 10,
  tags: string[] = [],
  sets?: string
): TaggedSetRecord => ({
  date,
  exercise,
  canonical: exercise.toLowerCase().replaceAll(' ', '-'),
  weight,
  reps,
  rpe: null,
  effects: [],
  baselineRange: null,
  meta: { rawExercise: exercise, sets },
  tags: new Set(['lift:accessory', ...tags]),
});

describe('classifyAccessory', () => {
  it.each([
    ['Lat Pulldown', 'upper-pull', 'high'],
    ['Chest Supported Row', 'upper-pull', 'high'],
    ['Dumbbell Curl', 'biceps', 'high'],
    ['Hamstring Curl', 'hamstrings', 'high'],
    ['Leg Press', 'quads', 'high'],
    ['Lateral Raise', 'shoulders', 'high'],
    ['Plank', 'core', 'high'],
    ['Sled Drag x LOTDAB', 'conditioning', 'high'],
    ['Dumbbell Fly', 'upper-push', 'medium'],
    ['45 Back Raise', 'low-back', 'high'],
    ['45 Back Raise w/10s hold', 'low-back', 'high'],
    ['Rev. Hyper', 'low-back', 'high'],
    ["Single Arm Farmer's Walk", 'carries', 'high'],
    ['Facepull', 'shoulders', 'high'],
    ['Palloff Press', 'core', 'high'],
    ['Birddog', 'core', 'high'],
    ['Side Bend', 'core', 'high'],
    ['Stir the pot', 'core', 'high'],
    ['Pull Through', 'glutes', 'high'],
    ['Dumbbell Rollback', 'triceps', 'high'],
    ['French Press', 'triceps', 'high'],
    ['Tate Press', 'triceps', 'high'],
    ['Mini Band Pull Apart', 'shoulders', 'high'],
    ['Press', null, 'none'],
    ['Curl', null, 'none'],
    ['Raise', null, 'none'],
  ])('%s -> %s', (exercise, category, confidence) => {
    expect(classifyAccessory(rec(exercise))).toMatchObject({ category, confidence });
  });

  it.each([
    [
      'user mapping takes precedence',
      rec('Mystery Movement'),
      { 'mystery-movement': 'glutes' as const },
      { category: 'glutes', source: 'user', confidence: 'high' },
    ],
    [
      'uncertain day-based upper tag stays unclassified',
      rec('Mystery Movement', undefined, undefined, undefined, ['accessory:upper']),
      {},
      { category: null, source: 'unclassified', confidence: 'none' },
    ],
    [
      'legacy core tag remains a documented fallback',
      rec('Mystery Movement', undefined, undefined, undefined, ['accessory:core']),
      {},
      { category: 'core', source: 'legacy-tag', confidence: 'low' },
    ],
  ])('%s', (_, record, mappings, expected) => {
    expect(classifyAccessory(record, mappings)).toEqual(expected);
  });
});

describe('buildAccessoryCoverage', () => {
  it.each([
    ['empty', [], []],
    [
      'unique sessions and volume by category',
      [
        rec('Lat Pulldown', 1, 100, 10),
        rec('Lat Pulldown', 1, 80, 8),
        rec('Row', 2, 50, 12),
        rec('Plank', 2, 0, 30),
      ],
      [
        { category: 'upper-pull', sessionCount: 2, volume: 2240 },
        { category: 'core', sessionCount: 1, volume: 0 },
      ],
    ],
    [
      'unclassified and primary lifts excluded',
      [rec('Raise'), { ...rec('Lat Pulldown'), tags: new Set(['lift:bench']) }],
      [],
    ],
    [
      'logged set counts multiply volume with invalid values falling back to one',
      [rec('Lat Pulldown', 1, 100, 10, [], '4'), rec('Row', 2, 50, 10, [], 'invalid')],
      [{ category: 'upper-pull', sessionCount: 2, volume: 4500 }],
    ],
  ])('%s', (_, records, expected) => {
    expect(buildAccessoryCoverage(records)).toEqual(expected);
  });
});
