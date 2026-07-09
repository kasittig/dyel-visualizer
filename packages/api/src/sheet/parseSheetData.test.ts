import { describe, it, expect } from 'vitest';
import { liftTypeOf, splitByEffort, parseSheetData } from './parseSheetData';
import type { LiftType } from './parseSheetData';
import type { TaggedSetRecord, AthleteContext } from '@dyel/pipeline';

const rec = (
  tags: string[] = [],
  { sets, rpe }: { sets?: number; rpe?: number } = {}
): TaggedSetRecord => ({
  date: Date.UTC(2024, 0, 1),
  exercise: 'test',
  weight: 100,
  reps: 1,
  canonical: 'test',
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
  sets,
  rpe,
});

const PLACEHOLDER_ATHLETE: AthleteContext = {
  sex: 'M',
  bodyweight: 90,
  deadliftStance: 'sumo',
};

describe('liftTypeOf', () => {
  it.each([
    ['squat family', ['lift:squat'], 'squat'],
    ['bench family', ['lift:bench'], 'bench'],
    ['deadlift family', ['lift:deadlift'], 'deadlift'],
    ['no lift tags (accessory)', ['some-other-tag'], 'accessory'],
  ])('returns %s for %s', (_, tags, expected) => {
    expect(liftTypeOf(rec(tags))).toBe(expected);
  });
});

describe('splitByEffort', () => {
  it.each([
    [
      'accessory: all records in maxEffort, volume empty',
      'accessory',
      [rec(['some-tag'], { sets: 3 }), rec(['other-tag'], { rpe: 8 }), rec(['another-tag'])],
      { allCount: 3, maxEffortCount: 3, volumeCount: 0 },
    ],
    [
      'squat: single set or rpe to maxEffort, multi-set no-rpe to volume',
      'squat',
      [
        rec(['lift:squat'], { sets: 1 }),
        rec(['lift:squat'], { sets: 3 }),
        rec(['lift:squat'], { sets: 2, rpe: 8 }),
        rec(['lift:squat'], { sets: 5 }),
      ],
      { allCount: 4, maxEffortCount: 2, volumeCount: 2 },
    ],
  ])('%s', (_, type, records, expected) => {
    const result = splitByEffort(records, type as LiftType);
    expect(result.all).toHaveLength(expected.allCount);
    expect(result.maxEffort).toHaveLength(expected.maxEffortCount);
    expect(result.volume).toHaveLength(expected.volumeCount);
  });
});

describe('parseSheetData (end-to-end)', () => {
  it('parses CSV and groups rows by lift type with effort splits', () => {
    const csv = `Date,Exercise,Reps,Weight (lbs),Sets,RPE
2026-01-01,Squat,5,225,3,
2026-01-01,Squat,3,275,1,9
2026-01-02,Bench,8,185,4,
2026-01-02,Bench Press,1,225,,8
2026-01-03,Deadlift,3,315,1,8
2026-01-03,Conventional Deadlift,5,275,2,
2026-01-04,Curls,8,50,3,
`;

    const result = parseSheetData(csv, PLACEHOLDER_ATHLETE);

    // Verify all four lift types are present in the result
    expect(result).toHaveProperty('squat');
    expect(result).toHaveProperty('bench');
    expect(result).toHaveProperty('deadlift');
    expect(result).toHaveProperty('accessory');

    // Squat: 2 records total (one 3-set volume, one 1-set max effort)
    expect(result.squat.all).toHaveLength(2);
    expect(result.squat.maxEffort).toHaveLength(1); // sets=1 or rpe defined
    expect(result.squat.volume).toHaveLength(1); // sets=3, no rpe

    // Bench: 2 records total (one 4-set volume, one 1-set max effort)
    expect(result.bench.all).toHaveLength(2);
    expect(result.bench.maxEffort).toHaveLength(1); // rpe=8 defined
    expect(result.bench.volume).toHaveLength(1); // sets=4, no rpe

    // Deadlift: 2 records total (one 1-set max effort, one 2-set volume)
    expect(result.deadlift.all).toHaveLength(2);
    expect(result.deadlift.maxEffort).toHaveLength(1); // rpe=8 defined
    expect(result.deadlift.volume).toHaveLength(1); // sets=2, no rpe

    // Accessory: curls are unknown and get filtered out, so empty
    expect(result.accessory.all).toHaveLength(0);
    expect(result.accessory.maxEffort).toHaveLength(0);
    expect(result.accessory.volume).toHaveLength(0);
  });
});
