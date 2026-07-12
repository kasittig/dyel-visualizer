import { describe, it, expect } from 'vitest';
import {
  buildCanonicalByLabel,
  resolveTargetLabel,
  buildRadarRows,
} from './variationRadarSelectors';
import type { TaggedSetRecord } from '@dyel/pipeline';

const rec = (
  canonical: string,
  date = 1000,
  tags = ['lift:squat'],
  rawEx?: string
): TaggedSetRecord => ({
  date,
  canonical,
  exercise: canonical,
  tags: new Set(tags),
  sets: 1,
  reps: 1,
  weight: 100,
  meta: rawEx ? { rawExercise: rawEx } : {},
  effects: [],
  baselineRange: null,
});

describe('buildCanonicalByLabel', () => {
  it.each([
    ['empty input', [], 'squat', new Map()],
    [
      'single match',
      [rec('b_press', 100, ['lift:bench'])],
      'bench',
      new Map([['b_press', 'b_press']]),
    ],
    [
      'picks latest date',
      [rec('bench1', 100, ['lift:bench'], 'Bench'), rec('bench2', 200, ['lift:bench'], 'Bench')],
      'bench',
      new Map([['Bench', 'bench2']]),
    ],
    [
      'excludes other lift types',
      [rec('b_press', 100, ['lift:bench']), rec('squat_hs', 100, ['lift:squat'])],
      'bench',
      new Map([['b_press', 'b_press']]),
    ],
    [
      'tracks separately',
      [rec('bench1', 100, ['lift:bench'], 'DB Bench'), rec('press1', 150, ['lift:bench'], 'OHP')],
      'bench',
      new Map([
        ['DB Bench', 'bench1'],
        ['OHP', 'press1'],
      ]),
    ],
  ])('%s', (_, tagged, liftType, expected) => {
    expect(buildCanonicalByLabel(tagged, liftType)).toEqual(expected);
  });
});

describe('resolveTargetLabel', () => {
  it.each([
    ['empty input', [], 'squat', 'squat', undefined],
    ['single match', [rec('b_press', 100, ['lift:bench'])], 'bench', 'b_press', 'b_press'],
    [
      'picks latest label version',
      [
        rec('squat', 100, ['lift:squat'], 'Squat v1'),
        rec('squat', 200, ['lift:squat'], 'Squat v2'),
      ],
      'squat',
      'squat',
      'Squat v2',
    ],
    [
      'no match for canonical',
      [rec('b_press', 100, ['lift:bench']), rec('db_press', 100, ['lift:bench'])],
      'bench',
      'squat',
      undefined,
    ],
    [
      'lift type exclusion',
      [rec('squat', 100, ['lift:squat']), rec('b_press', 100, ['lift:bench'])],
      'bench',
      'b_press',
      'b_press',
    ],
  ])('%s', (_, tagged, liftType, target, expected) => {
    expect(resolveTargetLabel(tagged, liftType, target)).toBe(expected);
  });
});

describe('buildRadarRows', () => {
  it.each([
    ['empty snapshot', {}, undefined, []],
    [
      'single variation',
      { 'Var A': 300 },
      undefined,
      [{ variation: 'Var A', e1rm: 300, targetE1rm: undefined }],
    ],
    [
      'sorted alphabetically',
      { 'Var C': 250, 'Var A': 320, 'Var B': 280 },
      undefined,
      [
        { variation: 'Var A', e1rm: 320, targetE1rm: undefined },
        { variation: 'Var B', e1rm: 280, targetE1rm: undefined },
        { variation: 'Var C', e1rm: 250, targetE1rm: undefined },
      ],
    ],
    [
      'excludes undefined e1rm',
      { 'Var A': 300, 'Var B': undefined, 'Var C': 280 },
      undefined,
      [
        { variation: 'Var A', e1rm: 300, targetE1rm: undefined },
        { variation: 'Var C', e1rm: 280, targetE1rm: undefined },
      ],
    ],
    [
      'injects targetE1rm on label match',
      { 'Var A': 300, 'Var B': 280 },
      'Var A',
      [
        { variation: 'Var A', e1rm: 300, targetE1rm: 300 },
        { variation: 'Var B', e1rm: 280, targetE1rm: 300 },
      ],
    ],
    [
      'targetE1rm undefined on mismatch',
      { 'Var A': 300, 'Var B': 280 },
      'Var C',
      [
        { variation: 'Var A', e1rm: 300, targetE1rm: undefined },
        { variation: 'Var B', e1rm: 280, targetE1rm: undefined },
      ],
    ],
  ])('%s', (_, snapshot, targetLabel, expected) => {
    expect(buildRadarRows(snapshot as Record<string, number | undefined>, targetLabel)).toEqual(
      expected
    );
  });
});
