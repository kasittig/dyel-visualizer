import { describe, it, expect } from 'vitest';
import { fitNormalizationModel, normalizeE1rm, projectToVariant } from './normalize';
import type { TaggedSetRecord } from '../tag/tag';
import type { AthleteContext } from './athlete';

const day = (n: number) => Date.UTC(2024, 0, n);

const athlete = (overrides?: Partial<AthleteContext>): AthleteContext => ({
  sex: 'M',
  bodyweight: 90,
  deadliftStance: 'conventional',
  ...overrides,
});

const rec = (
  date: number,
  canonical: string,
  weight: number,
  reps: number,
  tags: string[],
  sets?: number,
  rawExercise?: string
): TaggedSetRecord => ({
  date,
  exercise: canonical,
  weight,
  reps,
  canonical,
  tags: new Set(tags),
  ...((sets !== undefined || rawExercise !== undefined) && {
    meta: {
      ...(sets !== undefined && { sets: String(sets) }),
      ...(rawExercise !== undefined && { rawExercise }),
    },
  }),
});

const benchHistory: TaggedSetRecord[] = [
  rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift']),
  rec(day(10), 'bench', 110, 1, ['lift:bench', 'comp-lift']),
  rec(day(1), 'bench-chains', 80, 1, ['lift:bench', 'addl:chains', 'variation']),
  rec(day(10), 'bench-chains', 90, 1, ['lift:bench', 'addl:chains', 'variation']),
];

const squatHistory: TaggedSetRecord[] = [
  rec(day(1), 'squat', 200, 1, ['lift:squat', 'comp-lift']),
  rec(day(10), 'squat', 220, 1, ['lift:squat', 'comp-lift']),
  rec(day(1), 'squat-chains', 150, 1, ['lift:squat', 'addl:chains', 'variation']),
  rec(day(10), 'squat-chains', 160, 1, ['lift:squat', 'addl:chains', 'variation']),
];

const history = [...benchHistory, ...squatHistory];

describe('fitNormalizationModel', () => {
  it('picks exactly one baseline canonical per lift:* family (prefers comp-lift tag)', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:bench']).toBe('bench');
    expect(model.baseline['lift:squat']).toBe('squat');
  });

  it('falls back to most-sampled canonical when no comp-lift tag exists in the family', () => {
    const noCompLiftHistory: TaggedSetRecord[] = [
      rec(day(1), 'ohp-a', 50, 5, ['lift:ohp']),
      rec(day(3), 'ohp-a', 52, 5, ['lift:ohp']),
      rec(day(5), 'ohp-a', 54, 5, ['lift:ohp']),
      rec(day(1), 'ohp-b', 40, 5, ['lift:ohp']),
    ];
    const model = fitNormalizationModel(noCompLiftHistory, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:ohp']).toBe('ohp-a');
  });

  it('omits variantFactor entries below minSamples', () => {
    const model = fitNormalizationModel(history, { minSamples: 3 }, athlete());
    expect(model.variantFactor['bench-chains']).toBeUndefined();
  });

  it('includes variantFactor entries at/above minSamples, carrying n', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(model.variantFactor['bench-chains']).toEqual({ factor: expect.any(Number), n: 2 });
    expect(model.variantFactor['bench-chains'].factor).toBeCloseTo(0.809090909, 5);
  });

  it('fits addlWtOffset per-canonical, not pooled across families sharing the same addl tag', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(model.addlWtOffset['bench-chains']).toEqual({ offsetKg: 20, n: 2 });
    expect(model.addlWtOffset['squat-chains']).toEqual({ offsetKg: 55, n: 2 });
  });

  it('produces a plain-JSON-serializable model (JSON.stringify/parse round-trip)', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 }, athlete());
    const roundTripped = JSON.parse(JSON.stringify(model));
    expect(roundTripped).toEqual(model);
  });
});

describe('fitNormalizationModel — speed-work filtering', () => {
  const speedWorkPoint = rec(day(5), 'bench', 10, 1, ['lift:bench', 'comp-lift'], 9);
  const variantAtSameDate = rec(day(5), 'bench-chains2', 90, 1, [
    'lift:bench',
    'addl:chains',
    'variation',
  ]);

  it('excludes a 4+ set baseline entry from the interpolation grid used to fit variant factors', () => {
    const withoutSpeedWork = fitNormalizationModel(
      [...benchHistory, variantAtSameDate],
      {
        minSamples: 1,
      },
      athlete()
    );
    const withSpeedWork = fitNormalizationModel(
      [...benchHistory, variantAtSameDate, speedWorkPoint],
      { minSamples: 1 },
      athlete()
    );

    expect(withSpeedWork.variantFactor['bench-chains2'].factor).toBeCloseTo(
      withoutSpeedWork.variantFactor['bench-chains2'].factor,
      6
    );
  });

  it('would otherwise anchor the grid on the speed-work point (sanity check on the test setup)', () => {
    // Without the fix this is what a naive model would produce: the grid returns the bogus
    // 10kg speed-work value exactly (it lands on the query date), giving a tiny factor.
    const naiveFactor = 90 / 10;
    const model = fitNormalizationModel(
      [...benchHistory, variantAtSameDate, speedWorkPoint],
      {
        minSamples: 1,
      },
      athlete()
    );
    expect(model.variantFactor['bench-chains2'].factor).not.toBeCloseTo(naiveFactor, 1);
  });
});

describe('fitNormalizationModel — competition-named baseline preference', () => {
  it('prefers a "competition"-named variant as baseline over a comp-lift-tagged bare canonical', () => {
    const bareBench: TaggedSetRecord[] = [
      rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift'], undefined, 'Bench'),
      rec(day(3), 'bench', 105, 1, ['lift:bench', 'comp-lift'], undefined, 'Bench'),
    ];
    const competitionNamedVariant: TaggedSetRecord[] = [
      rec(
        day(1),
        'bench-chains3',
        90,
        1,
        ['lift:bench', 'addl:chains', 'variation'],
        undefined,
        'Competition Bench with chains'
      ),
      rec(
        day(5),
        'bench-chains3',
        92,
        1,
        ['lift:bench', 'addl:chains', 'variation'],
        undefined,
        'Competition Bench with chains'
      ),
      rec(
        day(10),
        'bench-chains3',
        95,
        1,
        ['lift:bench', 'addl:chains', 'variation'],
        undefined,
        'Competition Bench with chains'
      ),
    ];

    const model = fitNormalizationModel(
      [...bareBench, ...competitionNamedVariant],
      {
        minSamples: 1,
      },
      athlete()
    );

    expect(model.baseline['lift:bench']).toBe('bench-chains3');
  });

  it('falls back to the comp-lift tag when no name contains "competition"', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:bench']).toBe('bench');
  });
});

describe('normalizeE1rm', () => {
  it('returns input unchanged for the baseline canonical itself (identity, no lookup)', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(normalizeE1rm('bench', 123.4, model)).toBe(123.4);
  });

  it('returns e1rmKg / factor for a fitted variant', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const factor = model.variantFactor['bench-chains'].factor;
    expect(normalizeE1rm('bench-chains', 100, model)).toBeCloseTo(100 / factor, 6);
  });

  it('returns null when the canonical has no fitted entry', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(normalizeE1rm('bench-bands', 100, model)).toBeNull();
  });
});

describe('projectToVariant', () => {
  it('returns baselineE1rmKg unchanged when targeting the baseline canonical', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(projectToVariant(150, 'bench', model)).toBe(150);
  });

  it('returns baselineE1rmKg * factor for a fitted variant', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const factor = model.variantFactor['bench-chains'].factor;
    expect(projectToVariant(150, 'bench-chains', model)).toBeCloseTo(150 * factor, 6);
  });

  it('returns null when the target canonical has no fitted entry', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(projectToVariant(150, 'bench-bands', model)).toBeNull();
  });
});

describe('round-trip', () => {
  it('normalizeE1rm then projectToVariant returns the original value within floating point tolerance', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const normalized = normalizeE1rm('bench-chains', 150, model)!;
    const projected = projectToVariant(normalized, 'bench-chains', model)!;
    expect(projected).toBeCloseTo(150, 6);
  });
});

describe('fitNormalizationModel — deadlift stance preference tier', () => {
  it.each<[string, 'sumo' | 'conventional', TaggedSetRecord[], string]>([
    [
      'sumo preference with sumo-tagged history → baseline is sumo canonical',
      'sumo',
      [
        rec(day(1), 'deadlift-sumo', 200, 1, ['lift:deadlift', 'stance:sumo']),
        rec(day(5), 'deadlift-sumo', 210, 1, ['lift:deadlift', 'stance:sumo']),
        rec(day(1), 'deadlift-conventional', 180, 1, ['lift:deadlift', 'stance:conventional']),
      ],
      'deadlift-sumo',
    ],
    [
      'conventional preference with conventional-tagged history → baseline is conventional canonical',
      'conventional',
      [
        rec(day(1), 'deadlift-conventional', 190, 1, ['lift:deadlift', 'stance:conventional']),
        rec(day(5), 'deadlift-conventional', 200, 1, ['lift:deadlift', 'stance:conventional']),
        rec(day(1), 'deadlift-sumo', 170, 1, ['lift:deadlift', 'stance:sumo']),
      ],
      'deadlift-conventional',
    ],
    [
      'default (non-sumo preference) with conventional-tagged history → baseline is conventional canonical',
      'conventional',
      [
        rec(day(1), 'deadlift-conventional', 190, 1, ['lift:deadlift', 'stance:conventional']),
        rec(day(5), 'deadlift-conventional', 200, 1, ['lift:deadlift', 'stance:conventional']),
      ],
      'deadlift-conventional',
    ],
  ])('%s', (_, stance, deadliftHistory, expectedBaseline) => {
    const model = fitNormalizationModel(
      deadliftHistory,
      { minSamples: 1 },
      athlete({ deadliftStance: stance })
    );
    expect(model.baseline['lift:deadlift']).toBe(expectedBaseline);
  });

  it('regression: stance-preference tier takes priority over comp-lift-tagged record', () => {
    const deadliftHistory: TaggedSetRecord[] = [
      rec(day(1), 'deadlift-comp', 220, 1, ['lift:deadlift', 'comp-lift']),
      rec(day(5), 'deadlift-comp', 225, 1, ['lift:deadlift', 'comp-lift']),
      rec(day(1), 'deadlift-sumo', 200, 1, ['lift:deadlift', 'stance:sumo']),
      rec(day(3), 'deadlift-sumo', 210, 1, ['lift:deadlift', 'stance:sumo']),
    ];
    const model = fitNormalizationModel(
      deadliftHistory,
      { minSamples: 1 },
      athlete({ deadliftStance: 'sumo' })
    );
    // Stance preference takes priority over comp-lift tag, so baseline should be deadlift-sumo
    expect(model.baseline['lift:deadlift']).toBe('deadlift-sumo');
  });

  it('regression: competition-named record takes priority over stance-preference tier', () => {
    const deadliftHistory: TaggedSetRecord[] = [
      rec(
        day(1),
        'deadlift-comp-named',
        230,
        1,
        ['lift:deadlift', 'variation'],
        undefined,
        'Competition Deadlift'
      ),
      rec(
        day(5),
        'deadlift-comp-named',
        235,
        1,
        ['lift:deadlift', 'variation'],
        undefined,
        'Competition Deadlift'
      ),
      rec(
        day(3),
        'deadlift-comp-named',
        240,
        1,
        ['lift:deadlift', 'variation'],
        undefined,
        'Competition Deadlift'
      ),
      rec(day(1), 'deadlift-sumo', 200, 1, ['lift:deadlift', 'stance:sumo']),
      rec(day(3), 'deadlift-sumo', 210, 1, ['lift:deadlift', 'stance:sumo']),
    ];
    const model = fitNormalizationModel(
      deadliftHistory,
      { minSamples: 1 },
      athlete({ deadliftStance: 'sumo' })
    );
    // Competition-named takes top priority, superseding stance preference
    expect(model.baseline['lift:deadlift']).toBe('deadlift-comp-named');
  });
});
