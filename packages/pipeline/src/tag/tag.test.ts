import { describe, it, expect } from 'vitest';
import type { SetRecord } from '../types';
import {
  tagRecords,
  resolveCanonicalNames,
  matches,
  classifyExerciseName,
  classifyAccessorySubtypes,
  tagRecordsByPrimaryEvidence,
} from './tag';
import type { TaggedSetRecord } from './tag';
import { isCoreExercise, classifyAccessoryEffects } from './detect/detectors';

describe('resolveCanonicalNames', () => {
  it('rewrites exercise, deduplicates unresolved entries, and matches keys', () => {
    const r1: SetRecord[] = [
      { date: 1706745600000, exercise: 'Bench', weight: 102.06, reps: 5, rpe: 8 },
    ];
    const res1 = resolveCanonicalNames(r1);
    expect(res1.resolved).toMatchObject([{ exercise: 'bench' }]);
    expect(res1.unknown).toEqual([]);

    const r2: SetRecord[] = [
      { date: 1706745600000, exercise: 'Unknown Exercise', weight: 100, reps: 5 },
      { date: 1706745600000, exercise: 'Unknown Exercise', weight: 110, reps: 3 },
      { date: 1706745600000, exercise: 'Another Unknown', weight: 90, reps: 8 },
    ];
    const res2 = resolveCanonicalNames(r2);
    expect(res2.resolved).toHaveLength(0);
    expect(new Set(res2.unknown)).toEqual(new Set(['Unknown Exercise', 'Another Unknown']));

    const r3: SetRecord[] = [
      { date: 1706745600000, exercise: 'Bench', weight: 102.06, reps: 5 },
      { date: 1706745600000, exercise: 'bench press', weight: 106.59, reps: 3 },
      { date: 1706745600000, exercise: 'Comp Bench', weight: 111.13, reps: 1 },
    ];
    expect(
      resolveCanonicalNames(r3).resolved.map((r: SetRecord) => {
        return r.exercise;
      })
    ).toEqual(['bench', 'bench', 'bench']);
  });
});

describe('tagRecords', () => {
  it('handles structural maps, invalid constraints, and mixed modifiers', () => {
    const rec: SetRecord = {
      date: 1706745600000,
      exercise: 'bench',
      weight: 102.06,
      reps: 5,
      rpe: 8,
      meta: { rawUnit: 'lbs', rawWeight: '225' },
    };
    const res1 = tagRecords([rec]);
    expect(res1.unknown).toEqual([]);
    expect(res1.tagged[0]).toMatchObject({
      ...rec,
      canonical: 'bench',
      tags: new Set(['lift:bench', 'comp-lift', 'bar:standard', 'stance:wide', 'competition']),
    });

    const r2: SetRecord[] = [
      { date: 1706745600000, exercise: 'unknown-canonical', weight: 100, reps: 5 },
      { date: 1706745600000, exercise: 'unknown-canonical', weight: 110, reps: 3 },
      { date: 1706745600000, exercise: 'another-unknown', weight: 90, reps: 8 },
    ];
    const res2 = tagRecords(r2);
    expect(res2.tagged).toHaveLength(0);
    expect(new Set(res2.unknown)).toEqual(new Set(['unknown-canonical', 'another-unknown']));

    const r3: SetRecord[] = [
      { date: 1706745600000, exercise: 'bench', weight: 102.06, reps: 5 },
      { date: 1706745600000, exercise: 'unknown-canonical', weight: 100, reps: 5 },
      { date: 1706745600000, exercise: 'bench-chains', weight: 111.13, reps: 1 },
    ];
    const res3 = tagRecords(r3);
    expect(res3.unknown).toEqual(['unknown-canonical']);
    expect(res3.tagged[0].tags).toEqual(
      new Set(['lift:bench', 'comp-lift', 'bar:standard', 'stance:wide', 'competition'])
    );
    expect(res3.tagged[1].tags).toEqual(new Set(['lift:bench', 'addl:chains:1', 'competition']));
  });
});

describe('keyword-detector parsing', () => {
  const rec = (ex: string): SetRecord[] => {
    return [{ date: 1706745600000, exercise: ex, weight: 100, reps: 5 }];
  };

  it.each([
    ['ssb squat', 'SSB Squat', 'squat-ssb', 'bar:ssb'],
    ['sumo deadlift', 'Sumo Deadlift', 'deadlift-sumo', 'stance:sumo'],
    ['incline bench', 'Incline Bench', 'bench-incline', 'equip:incline'],
  ])('detects %s as canonical %s with tag %s', (_, ex, canonical, tag) => {
    const { resolved } = resolveCanonicalNames(rec(ex));
    expect(resolved[0].exercise).toBe(canonical);
    expect(tagRecords(resolved).tagged[0].tags.has(tag)).toBe(true);
  });

  it('verifies specialized exclusions, composites, and fallback filters', () => {
    expect(resolveCanonicalNames(rec('Bench (CG)')).resolved[0].exercise).toBe('bench-close');
    expect(tagRecords(resolveCanonicalNames(rec('Bench (CG)')).resolved).tagged[0].tags).toEqual(
      new Set(['lift:bench', 'stance:close'])
    );
    expect(resolveCanonicalNames(rec('floor press')).resolved[0].exercise).toBe('bench-floor');
    expect(new Set(tagRecords(rec('bench-chains')).tagged[0].effects)).toEqual(
      new Set(['BAR_SPEED', 'UPPER_PECS', 'REDUCED_ROM'])
    );

    const { resolved, tagged } = {
      ...resolveCanonicalNames(rec('sumo squat (chains)')),
      ...tagRecords(resolveCanonicalNames(rec('sumo squat (chains)')).resolved),
    };
    expect(resolved[0].exercise).toBe('squat-sumo-chains');
    expect(tagged[0].tags).toEqual(new Set(['lift:squat', 'stance:sumo', 'addl:chains:1']));
    expect(new Set(tagged[0].effects)).toEqual(
      new Set(['HIP_DOMINANT', 'POSTERIOR_CHAIN', 'BAR_SPEED'])
    );
  });

  it.each([
    ['unrecognized accessory name', 'Face Pulls', true],
    ['plain comp lift with all-default modifiers', 'Squat', false],
  ])('unknown heuristic filtering rules', (_, ex, isUnknown) => {
    const { resolved, unknown } = resolveCanonicalNames(rec(ex));
    if (isUnknown) {
      expect(unknown).toEqual([ex]);
      expect(resolved).toHaveLength(0);
    } else {
      expect(unknown).toHaveLength(0);
      expect(resolved).toHaveLength(1);
    }
  });
});

describe('matches', () => {
  it('correctly evaluates all logical tag match variations', () => {
    const t = new Set(['lift:bench', 'comp-lift', 'addl:chains', 'bar:olympic']);

    expect(matches(t, {})).toBe(true);
    expect(matches(t, { all: ['lift:bench', 'comp-lift'] })).toBe(true);
    expect(matches(new Set(['lift:bench']), { all: ['lift:bench', 'comp-lift'] })).toBe(false);
    expect(matches(t, { any: ['lift:squat', 'comp-lift', 'lift:bench'] })).toBe(true);
    expect(matches(new Set(['lift:bench']), { any: ['lift:squat', 'comp-lift'] })).toBe(false);
    expect(matches(new Set(['lift:bench']), { none: ['comp-lift', 'lift:squat'] })).toBe(true);
    expect(matches(t, { none: ['comp-lift'] })).toBe(false);
    expect(matches(t, { all: ['lift:bench', 'bar:olympic'] })).toBe(true);
    expect(matches(new Set(['comp-lift', 'variation']), { all: ['comp-lift'] })).toBe(true);
    expect(matches(t, { any: [] })).toBe(false);
    expect(matches(t, { all: [] })).toBe(true);
    expect(matches(t, { none: [] })).toBe(true);

    expect(
      matches(t, { all: ['lift:bench'], any: ['comp-lift', 'variation'], none: ['lift:squat'] })
    ).toBe(true);
    expect(matches(t, { all: ['lift:bench'], any: ['lift:squat'], none: ['comp-lift'] })).toBe(
      false
    );
    expect(matches(t, { all: ['lift:bench'], any: ['comp-lift'], none: ['comp-lift'] })).toBe(
      false
    );
  });
});

describe('classifyExerciseName', () => {
  it.each([
    ['recognized comp-lift name', 'Squat', 'squat', false],
    ['recognized comp-lift with modifier', 'Bench (CG)', 'bench', false],
    ['recognized deadlift variant', 'Sumo Deadlift', 'deadlift', false],
    ['unrecognized accessory name', 'Face Pulls', 'accessory', true],
    ['another unrecognized name', 'Unknown Exercise', 'accessory', true],
  ])('classifies %s "%s" as type %s, isUnknown %s', (_, name, expectedType, expectedIsUnknown) => {
    const result = classifyExerciseName(name);
    expect(result.type).toBe(expectedType);
    expect(result.isUnknown).toBe(expectedIsUnknown);
  });
});

describe('tagRecordsByPrimaryEvidence', () => {
  const record = (exercise: string, reps: number, rpe?: number): SetRecord => ({
    date: 1706745600000,
    exercise,
    weight: 100,
    reps,
    ...(rpe === undefined ? {} : { rpe }),
  });

  it.each([
    ['one rep with no RPE', 1, undefined, 'lift:bench'],
    ['three reps at RPE 9', 3, 9, 'lift:bench'],
    ['three reps below RPE 9', 3, 8.5, 'lift:accessory'],
    ['more than three reps', 4, 10, 'lift:accessory'],
    ['fractional reps', 2.5, 10, 'lift:accessory'],
  ])('classifies recognized candidates using %s', (_, reps, rpe, expectedTag) => {
    expect(
      tagRecordsByPrimaryEvidence([record('Incline Bench', reps, rpe)]).tagged[0].tags
    ).toContain(expectedTag);
  });

  it('promotes every record for a canonical variation when any record qualifies', () => {
    const result = tagRecordsByPrimaryEvidence([
      record('Incline Bench', 8, 8),
      record('Incline Bench', 3, 9),
      record('Incline Bench', 5, 7),
    ]);

    expect(result.tagged.every((r) => r.tags.has('lift:bench'))).toBe(true);
    expect(result.primaryTagged).toHaveLength(3);
    expect(result.unknown).toEqual([]);
  });

  it('promotes canonical aliases regardless of history order', () => {
    const result = tagRecordsByPrimaryEvidence([
      record('Bench Press', 8, 8),
      record('Comp Bench', 3, 9),
      record('Bench', 5, 7),
    ]);

    expect(result.tagged.map((r) => r.canonical)).toEqual(['bench', 'bench', 'bench']);
    expect(result.tagged.every((r) => r.tags.has('lift:bench'))).toBe(true);
  });

  it('keeps unknown validation independent from accessory classification', () => {
    const result = tagRecordsByPrimaryEvidence([
      record('Incline Bench', 8, 8),
      record('Face Pulls', 1, 10),
    ]);

    expect(result.tagged.every((r) => r.tags.has('lift:accessory'))).toBe(true);
    expect(result.tagged.map((r) => r.canonical)).toEqual(['bench-incline', 'face-pulls']);
    expect(result.tagged[0]).toMatchObject({ effects: [], baselineRange: null });
    expect(result.unknown).toEqual(['Face Pulls']);
  });
});

describe('classifyAccessorySubtypes', () => {
  const tr = (
    canonical: string,
    date: number,
    tags: string[],
    rawExercise?: string
  ): TaggedSetRecord => ({
    date,
    canonical,
    exercise: canonical,
    weight: 100,
    reps: 5,
    tags: new Set(tags),
    effects: [],
    baselineRange: null,
    meta: rawExercise ? { rawExercise } : undefined,
  });

  it.each([
    [
      'core-keyword exercise (Plank) on day with bench',
      [
        tr('bench', 1706745600000, [
          'lift:bench',
          'comp-lift',
          'bar:standard',
          'stance:wide',
          'competition',
        ]),
        tr('plank', 1706745600000, ['lift:accessory'], 'Plank'),
      ],
      1,
      ['lift:accessory', 'accessory:core'],
    ],
    [
      'non-core accessory on day with only bench',
      [
        tr('bench', 1706745600000, [
          'lift:bench',
          'comp-lift',
          'bar:standard',
          'stance:wide',
          'competition',
        ]),
        tr('face-pulls', 1706745600000, ['lift:accessory'], 'Face Pulls'),
      ],
      1,
      ['lift:accessory', 'accessory:upper'],
    ],
    [
      'non-core accessory on day with only squat',
      [
        tr('squat', 1706745600000, [
          'lift:squat',
          'comp-lift',
          'bar:standard',
          'stance:lowbar',
          'competition',
        ]),
        tr('leg-press', 1706745600000, ['lift:accessory'], 'Leg Press'),
      ],
      1,
      ['lift:accessory', 'accessory:lower'],
    ],
    [
      'non-core accessory on day with only deadlift',
      [
        tr('deadlift', 1706745600000, [
          'lift:deadlift',
          'comp-lift',
          'bar:standard',
          'stance:conventional',
        ]),
        tr('back-ext', 1706745600000, ['lift:accessory'], 'Back Extension'),
      ],
      1,
      ['lift:accessory', 'accessory:lower'],
    ],
    [
      'non-core accessory on day with both bench and squat',
      [
        tr('bench', 1706745600000, [
          'lift:bench',
          'comp-lift',
          'bar:standard',
          'stance:wide',
          'competition',
        ]),
        tr('squat', 1706745600000, [
          'lift:squat',
          'comp-lift',
          'bar:standard',
          'stance:lowbar',
          'competition',
        ]),
        tr('dips', 1706745600000, ['lift:accessory'], 'Dips'),
      ],
      2,
      ['lift:accessory'],
    ],
    [
      'non-core accessory on day with no comp-lift',
      [
        tr('face-pulls', 1706745600000, ['lift:accessory'], 'Face Pulls'),
        tr('db-curl', 1706745600000, ['lift:accessory'], 'Dumbbell Curls'),
      ],
      0,
      ['lift:accessory'],
    ],
    [
      'core-keyword exercise on day with no comp-lift',
      [tr('plank', 1706745600000, ['lift:accessory'], 'Plank')],
      0,
      ['lift:accessory', 'accessory:core'],
    ],
    [
      'comp-lift record passes through unchanged',
      [
        tr('bench', 1706745600000, [
          'lift:bench',
          'comp-lift',
          'bar:standard',
          'stance:wide',
          'competition',
        ]),
      ],
      0,
      ['lift:bench', 'comp-lift', 'bar:standard', 'stance:wide', 'competition'],
    ],
  ])('classifyAccessorySubtypes: %s', (_, input, recordIndex, expectedTags) => {
    const result = classifyAccessorySubtypes(input);
    expect(result[recordIndex].tags).toEqual(new Set(expectedTags));
  });
});

describe('isCoreExercise', () => {
  it.each([
    ['Plank', true],
    ['Ab Wheel Rollout', true],
    ['Russian Twist', true],
    ['Sit-up', true],
    ['Crunch', true],
    ['Crunches', true],
    ['Hollow Body Hold', true],
    ['Pallof Press', true],
    ['Wood Chop', true],
    ['Dead Bug', true],
    ['V-up', true],
    ['Leg Raise', true],
    ['Cable Fly', false],
    ['Table Row', false],
    ['Barbell Row', false],
    ['Leg Press', false],
  ])('isCoreExercise: %s is %s', (name, expected) => {
    expect(isCoreExercise(name)).toBe(expected);
  });
});

describe('classifyAccessoryEffects', () => {
  it.each([
    ['Lat Pulldown', ['BACK']],
    ['Barbell Row', ['BACK']],
    ['Seated Cable Rows', ['BACK']],
    ['Lateral Raise', []],
    ['Dumbbell OHP', ['SHOULDERS']],
    ['Overhead Press', ['SHOULDERS']],
    ['Tricep Pushdown', ['TRICEPS']],
    ['Skull Crusher (Tri)', ['TRICEPS']],
    ['Glute Bridge', ['POSTERIOR_CHAIN']],
    ['GHR', ['POSTERIOR_CHAIN']],
    ['Bicep Curl', ['BICEPS']],
  ])('classifies "%s" as %s', (name, expected) => {
    expect(classifyAccessoryEffects(name)).toEqual(expected);
  });
});
