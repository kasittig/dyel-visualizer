import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildAccessoryTableRows } from './accessorySubtypeTable';

const d0 = new Date(2026, 0, 15);
const d1 = new Date(2026, 0, 14);

// Factory helper with optimal defaults to cut boilerplate
const rec = (
  d: Date,
  name: string,
  reps = 10,
  weight = 100,
  rpe = 7,
  sub?: string,
  tags?: string[]
): TaggedSetRecord => ({
  date: d.getTime(),
  exercise: name,
  canonical: name,
  weight,
  reps,
  rpe,
  effects: [],
  baselineRange: null,
  meta: {
    rawExercise: name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  },
  tags: new Set(
    tags
      ? ['lift:accessory', ...tags]
      : sub
        ? ['lift:accessory', `accessory:${sub}`]
        : ['lift:accessory']
  ),
});

// Shared expected output builder to compress table rows
const row = (
  label: string,
  subtype: string | null,
  date: string,
  sets = 1,
  reps = 10,
  weight = 100,
  rpe = 7
) => ({
  label,
  subtype,
  lastSession: { date, sets, reps, weight, rpe },
});

describe('buildAccessoryTableRows', () => {
  it.each([
    ['empty input', [], []],
    [
      'subtypes (core, upper, lower, none)',
      [
        rec(d0, 'ab-wheel', 10, 0, 8, 'core'),
        rec(d0, 'lat-pulldown', 8, 100, 7, 'upper'),
        rec(d0, 'leg-curl', 12, 80, 6, 'lower'),
        rec(d0, 'misc-exercise', 10, 50, 7),
      ],
      [
        row('Ab Wheel', 'core', '2026-01-15', 1, 10, 0, 8),
        row('Lat Pulldown', 'upper', '2026-01-15', 1, 8, 100, 7),
        row('Leg Curl', 'lower', '2026-01-15', 1, 12, 80, 6),
        row('Misc Exercise', null, '2026-01-15', 1, 10, 50, 7),
      ],
    ],
    [
      'non-accessory record excluded',
      [
        { ...rec(d0, 'bench'), tags: new Set(['lift:bench', 'comp-lift']) },
        rec(d0, 'lat-pulldown', 8, 100, 7, 'upper'),
      ],
      [row('Lat Pulldown', 'upper', '2026-01-15', 1, 8, 100, 7)],
    ],
    [
      'multiple accessories of same label on same date resolve to one row',
      [
        rec(d0, 'lat-pulldown', 8, 100, 7, 'upper'),
        rec(d0, 'lat-pulldown', 8, 100, 7, 'upper'),
        rec(d0, 'lat-pulldown', 6, 90, 6, 'upper'),
      ],
      [row('Lat Pulldown', 'upper', '2026-01-15', 3, 8, 100, 7)],
    ],
    [
      'picks most recent date for subtype determination',
      [rec(d1, 'leg-curl', 12, 80, 6, 'lower'), rec(d0, 'leg-curl', 12, 85, 7, 'upper')],
      [row('Leg Curl', 'upper', '2026-01-15', 1, 12, 85, 7)],
    ],
  ])('%s', (_, input, expected) => {
    // Sort logic inherently verified via grouped assertions
    const result = buildAccessoryTableRows(input);
    expect(result).toEqual(expected.sort((a, b) => a.label.localeCompare(b.label)));
  });
});
