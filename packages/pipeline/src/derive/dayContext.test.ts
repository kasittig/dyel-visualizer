import { describe, expect, it } from 'vitest';
import type { SetRecord } from '../types';
import { deriveDayContexts } from './dayContext';

const DAY_1 = Date.UTC(2026, 0, 2);
const DAY_2 = Date.UTC(2026, 0, 3);
const record = (date: number, meta?: Record<string, string>): SetRecord => ({
  date,
  exercise: 'Squat',
  weight: 100,
  reps: 1,
  meta,
});

describe('deriveDayContexts', () => {
  it.each([
    [
      'uses one bodyweight from any row for the complete UTC day',
      [record(DAY_1), record(DAY_1 + 60_000, { bodyweight: '81.5' }), record(DAY_1 + 120_000)],
      [{ date: DAY_1, bodyweightKg: 81.5, notes: [], findings: [] }],
    ],
    [
      'deduplicates numerically identical bodyweights',
      [record(DAY_1, { bodyweight: '80' }), record(DAY_1, { bodyweight: '80.0' })],
      [{ date: DAY_1, bodyweightKg: 80, notes: [], findings: [] }],
    ],
    [
      'reports conflicts without selecting a bodyweight',
      [record(DAY_1, { bodyweight: '80' }), record(DAY_1, { bodyweight: '81' })],
      [
        {
          date: DAY_1,
          bodyweightKg: null,
          notes: [],
          findings: [{ type: 'conflicting-bodyweights', valuesKg: [80, 81] }],
        },
      ],
    ],
    [
      'deduplicates exact nonempty notes in source order without interpreting them',
      [
        record(DAY_1, { notes: 'Left knee 3/10' }),
        record(DAY_1, { notes: 'felt great' }),
        record(DAY_1, { notes: 'Left knee 3/10' }),
        record(DAY_1, { notes: '   ' }),
      ],
      [
        {
          date: DAY_1,
          bodyweightKg: null,
          notes: ['Left knee 3/10', 'felt great'],
          findings: [],
        },
      ],
    ],
    [
      'does not carry context between dates',
      [
        record(DAY_1, { bodyweight: '80', notes: 'poor sleep' }),
        record(DAY_2, { notes: 'deload' }),
      ],
      [
        { date: DAY_1, bodyweightKg: 80, notes: ['poor sleep'], findings: [] },
        { date: DAY_2, bodyweightKg: null, notes: ['deload'], findings: [] },
      ],
    ],
  ])('%s', (_, records, expected) => {
    expect(deriveDayContexts(records)).toEqual(expected);
  });

  it('does not change record metadata or its raw audit fields', () => {
    const records = [
      record(DAY_1, {
        bodyweight: '81.6466266',
        rawBodyweight: '180',
        rawBodyweightUnit: 'lbs',
        notes: 'slept poorly',
      }),
    ];

    deriveDayContexts(records);

    expect(records[0].meta).toEqual({
      bodyweight: '81.6466266',
      rawBodyweight: '180',
      rawBodyweightUnit: 'lbs',
      notes: 'slept poorly',
    });
  });
});
