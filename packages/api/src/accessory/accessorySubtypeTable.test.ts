import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildAccessoryTableRows } from './accessorySubtypeTable';

const rec = (
  d: Date,
  canonical: string,
  reps: number,
  weight: number,
  rpe?: number,
  rawExercise?: string,
  tags: Set<string> = new Set(['lift:accessory'])
): TaggedSetRecord => ({
  date: d.getTime(),
  exercise: canonical,
  weight,
  reps,
  rpe,
  canonical,
  tags,
  effects: [],
  baselineRange: null,
  meta: rawExercise ? { rawExercise } : undefined,
});

const d0 = new Date(2026, 0, 15);
const d1 = new Date(2026, 0, 14);

describe('buildAccessoryTableRows', () => {
  it.each([
    ['empty input', [], []],
    [
      'single accessory with core subtype',
      [rec(d0, 'ab-wheel', 10, 0, 8, 'Ab Wheel', new Set(['lift:accessory', 'accessory:core']))],
      [
        {
          label: 'Ab Wheel',
          subtype: 'core',
          lastSession: { date: '2026-01-15', sets: 1, reps: 10, weight: 0, rpe: 8 },
        },
      ],
    ],
    [
      'single accessory with upper subtype',
      [
        rec(
          d0,
          'lat-pulldown',
          8,
          100,
          7,
          'Lat Pulldown',
          new Set(['lift:accessory', 'accessory:upper'])
        ),
      ],
      [
        {
          label: 'Lat Pulldown',
          subtype: 'upper',
          lastSession: { date: '2026-01-15', sets: 1, reps: 8, weight: 100, rpe: 7 },
        },
      ],
    ],
    [
      'single accessory with lower subtype',
      [rec(d0, 'leg-curl', 12, 80, 6, 'Leg Curl', new Set(['lift:accessory', 'accessory:lower']))],
      [
        {
          label: 'Leg Curl',
          subtype: 'lower',
          lastSession: { date: '2026-01-15', sets: 1, reps: 12, weight: 80, rpe: 6 },
        },
      ],
    ],
    [
      'single accessory with no subtype',
      [rec(d0, 'misc-exercise', 10, 50, 7, 'Misc Exercise', new Set(['lift:accessory']))],
      [
        {
          label: 'Misc Exercise',
          subtype: null,
          lastSession: { date: '2026-01-15', sets: 1, reps: 10, weight: 50, rpe: 7 },
        },
      ],
    ],
    [
      'non-accessory record excluded',
      [
        rec(d0, 'bench', 5, 100, 8, undefined, new Set(['lift:bench', 'comp-lift'])),
        rec(
          d0,
          'lat-pulldown',
          8,
          100,
          7,
          'Lat Pulldown',
          new Set(['lift:accessory', 'accessory:upper'])
        ),
      ],
      [
        {
          label: 'Lat Pulldown',
          subtype: 'upper',
          lastSession: { date: '2026-01-15', sets: 1, reps: 8, weight: 100, rpe: 7 },
        },
      ],
    ],
    [
      'multiple accessories of same label on same date resolve to one row',
      [
        rec(
          d0,
          'lat-pulldown',
          8,
          100,
          7,
          'Lat Pulldown',
          new Set(['lift:accessory', 'accessory:upper'])
        ),
        rec(
          d0,
          'lat-pulldown',
          8,
          100,
          7,
          'Lat Pulldown',
          new Set(['lift:accessory', 'accessory:upper'])
        ),
        rec(
          d0,
          'lat-pulldown',
          6,
          90,
          6,
          'Lat Pulldown',
          new Set(['lift:accessory', 'accessory:upper'])
        ),
      ],
      [
        {
          label: 'Lat Pulldown',
          subtype: 'upper',
          lastSession: { date: '2026-01-15', sets: 3, reps: 8, weight: 100, rpe: 7 },
        },
      ],
    ],
    [
      'picks most recent date for subtype determination',
      [
        rec(d1, 'leg-curl', 12, 80, 6, 'Leg Curl', new Set(['lift:accessory', 'accessory:lower'])),
        rec(d0, 'leg-curl', 12, 85, 7, 'Leg Curl', new Set(['lift:accessory', 'accessory:upper'])),
      ],
      [
        {
          label: 'Leg Curl',
          subtype: 'upper', // Most recent date (d0) has upper tag
          lastSession: { date: '2026-01-15', sets: 1, reps: 12, weight: 85, rpe: 7 },
        },
      ],
    ],
    [
      'sorts multiple labels alphabetically',
      [
        rec(
          d0,
          'leg-curl',
          12,
          80,
          6,
          'Zulu Leg Curl',
          new Set(['lift:accessory', 'accessory:lower'])
        ),
        rec(
          d0,
          'lat-pulldown',
          8,
          100,
          7,
          'Alpha Lat Pulldown',
          new Set(['lift:accessory', 'accessory:upper'])
        ),
        rec(
          d0,
          'ab-wheel',
          10,
          0,
          8,
          'Beta Ab Wheel',
          new Set(['lift:accessory', 'accessory:core'])
        ),
      ],
      [
        {
          label: 'Alpha Lat Pulldown',
          subtype: 'upper',
          lastSession: { date: '2026-01-15', sets: 1, reps: 8, weight: 100, rpe: 7 },
        },
        {
          label: 'Beta Ab Wheel',
          subtype: 'core',
          lastSession: { date: '2026-01-15', sets: 1, reps: 10, weight: 0, rpe: 8 },
        },
        {
          label: 'Zulu Leg Curl',
          subtype: 'lower',
          lastSession: { date: '2026-01-15', sets: 1, reps: 12, weight: 80, rpe: 6 },
        },
      ],
    ],
  ])('%s', (_, input, expected) => {
    expect(buildAccessoryTableRows(input)).toEqual(expected);
  });
});
