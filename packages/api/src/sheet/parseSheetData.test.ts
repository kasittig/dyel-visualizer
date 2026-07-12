import { describe, it, expect } from 'vitest';
import {
  liftTypeOf,
  splitByEffort,
  parseSheetData,
  groupByLiftType,
  type LiftType,
} from './parseSheetData';
import type { TaggedSetRecord, AthleteContext } from '@dyel/pipeline';

const rec = (tags: string[] = [], opts?: { sets?: number; rpe?: number }): TaggedSetRecord => ({
  date: Date.UTC(2024, 0, 1),
  exercise: 'test',
  weight: 100,
  reps: 1,
  canonical: 'test',
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
  sets: opts?.sets,
  rpe: opts?.rpe,
});

const athlete: AthleteContext = { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' };

describe('liftTypeOf', () => {
  it.each([
    ['squat family', ['lift:squat'], 'squat'],
    ['bench family', ['lift:bench'], 'bench'],
    ['deadlift family', ['lift:deadlift'], 'deadlift'],
    ['accessory tag fallback', ['other-tag'], 'accessory'],
  ])('%s', (_, tags, expected) => {
    expect(liftTypeOf(rec(tags))).toBe(expected);
  });
});

describe('splitByEffort', () => {
  it.each([
    [
      'accessory sets maxEffort',
      'accessory',
      [rec(['t'], { sets: 3 }), rec(['t'], { rpe: 8 }), rec(['t'])],
      [3, 3, 0],
    ],
    [
      'squat distributes values',
      'squat',
      [
        rec(['lift:squat'], { sets: 1 }),
        rec(['lift:squat'], { sets: 3 }),
        rec(['lift:squat'], { sets: 2, rpe: 8 }),
        rec(['lift:squat'], { sets: 5 }),
      ],
      [4, 2, 2],
    ],
  ])('%s', (_, type, records, [all, max, vol]) => {
    const res = splitByEffort(records, type as LiftType);
    expect(res.all).toHaveLength(all);
    expect(res.maxEffort).toHaveLength(max);
    expect(res.volume).toHaveLength(vol);
  });
});

describe('groupByLiftType', () => {
  it('groups records across types and handles effort splits', () => {
    const records = [
      rec(['lift:squat'], { sets: 1 }),
      rec(['lift:squat'], { sets: 3 }),
      rec(['lift:bench'], { rpe: 8 }),
      rec(['lift:bench'], { sets: 4 }),
      rec(['lift:deadlift'], { sets: 1 }),
      rec(['lift:deadlift'], { sets: 5 }),
      rec(['acc-tag'], { sets: 3 }),
    ];
    const res = groupByLiftType(records);

    expect(res.squat.all).toHaveLength(2);
    expect(res.squat.maxEffort).toHaveLength(1);
    expect(res.squat.volume).toHaveLength(1);

    expect(res.bench.maxEffort).toHaveLength(1);
    expect(res.bench.volume).toHaveLength(1);

    expect(res.deadlift.maxEffort).toHaveLength(1);
    expect(res.deadlift.volume).toHaveLength(1);

    expect(res.accessory.maxEffort).toHaveLength(1);
    expect(res.accessory.volume).toHaveLength(0);

    expect(groupByLiftType([]).squat.all).toHaveLength(0);
  });
});

describe('parseSheetData (end-to-end)', () => {
  it('parses CSV and groups rows by lift type with effort splits', () => {
    const csv =
      'Date,Exercise,Reps,Weight (lbs),Sets,RPE\n2026-01-01,Squat,5,225,3,\n2026-01-01,Squat,3,275,1,9\n2026-01-02,Bench,8,185,4,\n2026-01-02,Bench Press,1,225,,8\n2026-01-03,Deadlift,3,315,1,8\n2026-01-03,Conventional Deadlift,5,275,2,';
    const res = parseSheetData(csv, athlete);

    expect(res.squat.maxEffort).toHaveLength(1);
    expect(res.squat.volume).toHaveLength(1);
    expect(res.bench.maxEffort).toHaveLength(1);
    expect(res.bench.volume).toHaveLength(1);
    expect(res.deadlift.maxEffort).toHaveLength(1);
    expect(res.deadlift.volume).toHaveLength(1);
    expect(res.accessory.all).toHaveLength(0);
  });
});
