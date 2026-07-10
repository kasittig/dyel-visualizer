import { describe, it, expect } from 'vitest';
import {
  fitNormalizationModel,
  normalizeE1rm,
  projectToVariant,
  offsetAdjustRecords,
} from './normalize';
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
  effects: [],
  baselineRange: null,
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

describe('fitNormalizationModel core and speed-work behavior', () => {
  it('resolves baselines, applies sample filters, fits offsets, and verifies JSON serialization', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:bench']).toBe('bench');
    expect(model.baseline['lift:squat']).toBe('squat');
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);

    const noComp = [
      rec(day(1), 'ohp-a', 50, 5, ['lift:ohp']),
      rec(day(3), 'ohp-a', 52, 5, ['lift:ohp']),
      rec(day(5), 'ohp-a', 54, 5, ['lift:ohp']),
      rec(day(1), 'ohp-b', 40, 5, ['lift:ohp']),
    ];
    expect(fitNormalizationModel(noComp, { minSamples: 1 }, athlete()).baseline['lift:ohp']).toBe(
      'ohp-a'
    );

    expect(
      fitNormalizationModel(history, { minSamples: 3 }, athlete()).variantFactor['bench-chains']
    ).toBeUndefined();

    const m2 = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(m2.variantFactor['bench-chains']).toEqual({ factor: expect.any(Number), n: 2 });
    expect(m2.variantFactor['bench-chains'].factor).toBeCloseTo(1, 5);
    expect(m2.addlWtOffset['bench-chains']).toEqual({ offsetKg: 20, n: 2 });
    expect(m2.addlWtOffset['squat-chains']).toEqual({ offsetKg: 55, n: 2 });
  });

  it('includes speed-work sets in grid interpolation and anchors variant query dates', () => {
    const sw = rec(day(5), 'bench', 10, 1, ['lift:bench', 'comp-lift'], 9),
      vDate = rec(day(5), 'bench-paused', 95, 1, ['lift:bench', 'variation']);
    const wOut = fitNormalizationModel([...benchHistory, vDate], { minSamples: 1 }, athlete());
    const wIn = fitNormalizationModel([...benchHistory, vDate, sw], { minSamples: 1 }, athlete());

    expect(wIn.variantFactor['bench-paused'].factor).not.toBeCloseTo(
      wOut.variantFactor['bench-paused'].factor,
      1
    );
    expect(wIn.variantFactor['bench-paused'].factor).toBeCloseTo(95 / 10, 1);
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

describe('fitNormalizationModel — bench paused/"commands" preference tier', () => {
  it('prefers a paused (equip:pause), otherwise competition-shaped bench over a plain comp-lift bench', () => {
    const benchWithPause: TaggedSetRecord[] = [
      rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift']),
      rec(day(5), 'bench', 105, 1, ['lift:bench', 'comp-lift']),
      rec(day(1), 'bench-pause', 95, 1, ['lift:bench', 'equip:pause']),
      rec(day(3), 'bench-pause', 97, 1, ['lift:bench', 'equip:pause']),
    ];
    const model = fitNormalizationModel(benchWithPause, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:bench']).toBe('bench-pause');
  });

  it('falls back to the comp-lift tag when no paused bench is present (existing behavior unaffected)', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:bench']).toBe('bench');
  });

  it('does not treat a paused bench that also deviates on bar/stance/addlWt as competition-shaped', () => {
    const benchWithNonCompPause: TaggedSetRecord[] = [
      rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift']),
      rec(day(5), 'bench', 105, 1, ['lift:bench', 'comp-lift']),
      // Paused, but also chains — not competition-shaped, so should not win over plain comp-lift.
      rec(day(1), 'bench-chains-pause', 80, 1, ['lift:bench', 'equip:pause', 'addl:chains']),
      rec(day(3), 'bench-chains-pause', 82, 1, ['lift:bench', 'equip:pause', 'addl:chains']),
    ];
    const model = fitNormalizationModel(benchWithNonCompPause, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:bench']).toBe('bench');
  });

  it('does not leak the pausedPool tier into other lift families (e.g. squat)', () => {
    const squatWithPauseTag: TaggedSetRecord[] = [
      rec(day(1), 'squat', 200, 1, ['lift:squat', 'comp-lift']),
      rec(day(5), 'squat', 210, 1, ['lift:squat', 'comp-lift']),
      // A squat record tagged equip:pause should never be preferred via the bench-only tier.
      rec(day(1), 'squat-pause', 180, 1, ['lift:squat', 'equip:pause']),
    ];
    const model = fitNormalizationModel(squatWithPauseTag, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:squat']).toBe('squat');
  });

  it('competition-named record still takes top priority over a paused bench', () => {
    const benchWithNamedAndPause: TaggedSetRecord[] = [
      rec(
        day(1),
        'bench-comp-named',
        110,
        1,
        ['lift:bench', 'variation'],
        undefined,
        'Competition Bench'
      ),
      rec(
        day(5),
        'bench-comp-named',
        115,
        1,
        ['lift:bench', 'variation'],
        undefined,
        'Competition Bench'
      ),
      rec(day(1), 'bench-pause', 95, 1, ['lift:bench', 'equip:pause']),
      rec(day(3), 'bench-pause', 97, 1, ['lift:bench', 'equip:pause']),
    ];
    const model = fitNormalizationModel(benchWithNamedAndPause, { minSamples: 1 }, athlete());
    expect(model.baseline['lift:bench']).toBe('bench-comp-named');
  });
});

describe('normalizeE1rm', () => {
  it('returns input unchanged for the baseline canonical itself (identity, no lookup)', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(normalizeE1rm('bench', 123.4, model)).toBe(123.4);
  });

  it('returns e1rmKg / factor for a fitted variant (pure factor operation, Design C)', () => {
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

  it('returns max(0, baselineE1rmKg * factor) for a fitted variant (pure factor operation, Design C)', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const factor = model.variantFactor['bench-chains'].factor;
    expect(projectToVariant(150, 'bench-chains', model)).toBeCloseTo(Math.max(0, 150 * factor), 6);
  });

  it('returns null when the target canonical has no fitted entry', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(projectToVariant(150, 'bench-bands', model)).toBeNull();
  });
});

describe('offsetAdjustRecords', () => {
  it('adds offsetKg to weight for a canonical with fitted addlWtOffset', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const record = rec(day(1), 'bench-chains', 80, 1, ['lift:bench', 'addl:chains']);
    const adjusted = offsetAdjustRecords([record], model);
    const expectedWeight = 80 + (model.addlWtOffset['bench-chains']?.offsetKg ?? 0);
    expect(adjusted[0].weight).toBe(expectedWeight);
  });

  it('leaves records unchanged for canonicals with no fitted offset', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const record = rec(day(1), 'bench', 100, 1, ['lift:bench']);
    const adjusted = offsetAdjustRecords([record], model);
    expect(adjusted[0].weight).toBe(100);
  });

  it('leaves baseline canonical records unchanged (no offset entry for baseline)', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const baselineRec = rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift']);
    const adjusted = offsetAdjustRecords([baselineRec], model);
    expect(adjusted[0].weight).toBe(100);
    expect(model.addlWtOffset['bench']).toBeUndefined();
  });

  it('returns new objects without mutating the input array or records', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const records = [rec(day(1), 'bench-chains', 80, 1, ['lift:bench', 'addl:chains'])];
    const originalWeight = records[0].weight;
    const adjusted = offsetAdjustRecords(records, model);
    expect(records[0].weight).toBe(originalWeight);
    expect(adjusted).not.toBe(records);
    expect(adjusted[0]).not.toBe(records[0]);
  });
});

describe('round-trip', () => {
  it('normalizeE1rm then projectToVariant returns the original value within floating point tolerance', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const normalized = normalizeE1rm('bench-chains', 150, model)!;
    const projected = projectToVariant(normalized, 'bench-chains', model)!;
    expect(projected).toBeCloseTo(150, 6);
  });

  it('round-trip holds for non-addlWt canonicals too (regression: no offset term)', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    const normalized = normalizeE1rm('squat-chains', 200, model)!;
    const projected = projectToVariant(normalized, 'squat-chains', model)!;
    expect(projected).toBeCloseTo(200, 6);
  });
});

describe('fitNormalizationModel — deadlift stance preference tier', () => {
  it.each<[string, 'sumo' | 'conventional', TaggedSetRecord[], string]>([
    [
      'sumo preference matched',
      'sumo',
      [
        rec(day(1), 'deadlift-sumo', 200, 1, ['lift:deadlift', 'stance:sumo']),
        rec(day(5), 'deadlift-sumo', 210, 1, ['lift:deadlift', 'stance:sumo']),
        rec(day(1), 'deadlift-conventional', 180, 1, ['lift:deadlift', 'stance:conventional']),
      ],
      'deadlift-sumo',
    ],
    [
      'conv preference matched',
      'conventional',
      [
        rec(day(1), 'deadlift-conventional', 190, 1, ['lift:deadlift', 'stance:conventional']),
        rec(day(5), 'deadlift-conventional', 200, 1, ['lift:deadlift', 'stance:conventional']),
        rec(day(1), 'deadlift-sumo', 170, 1, ['lift:deadlift', 'stance:sumo']),
      ],
      'deadlift-conventional',
    ],
    [
      'default non-sumo path',
      'conventional',
      [
        rec(day(1), 'deadlift-conventional', 190, 1, ['lift:deadlift', 'stance:conventional']),
        rec(day(5), 'deadlift-conventional', 200, 1, ['lift:deadlift', 'stance:conventional']),
      ],
      'deadlift-conventional',
    ],
  ])('%s', (_, stance, deadliftHistory, expected) => {
    expect(
      fitNormalizationModel(deadliftHistory, { minSamples: 1 }, athlete({ deadliftStance: stance }))
        .baseline['lift:deadlift']
    ).toBe(expected);
  });

  it('verifies precedence rules: competition-named over stance-preference, over comp-lift-tagged', () => {
    const baseHistory = [
      rec(day(1), 'deadlift-sumo', 200, 1, ['lift:deadlift', 'stance:sumo']),
      rec(day(3), 'deadlift-sumo', 210, 1, ['lift:deadlift', 'stance:sumo']),
    ];

    const h1 = [
      rec(day(1), 'deadlift-comp', 220, 1, ['lift:deadlift', 'comp-lift']),
      rec(day(5), 'deadlift-comp', 225, 1, ['lift:deadlift', 'comp-lift']),
      ...baseHistory,
    ];
    expect(
      fitNormalizationModel(h1, { minSamples: 1 }, athlete({ deadliftStance: 'sumo' })).baseline[
        'lift:deadlift'
      ]
    ).toBe('deadlift-sumo');

    const h2 = [
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
      ...baseHistory,
    ];
    expect(
      fitNormalizationModel(h2, { minSamples: 1 }, athlete({ deadliftStance: 'sumo' })).baseline[
        'lift:deadlift'
      ]
    ).toBe('deadlift-comp-named');
  });
});

describe('fitNormalizationModel — Task 10a: addlWtOffset fit-time adjustment', () => {
  it('applies offset-adjusted weights for factors and isolates non-addlWt variants', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    expect(model.variantFactor['bench-chains'].factor).toBeCloseTo(1, 5);
    expect(model.variantFactor['bench-chains'].factor).not.toBeCloseTo(0.809090909, 2);

    const noAddlHistory: TaggedSetRecord[] = [
      rec(day(1), 'squat', 200, 1, ['lift:squat', 'comp-lift']),
      rec(day(10), 'squat', 220, 1, ['lift:squat', 'comp-lift']),
      rec(day(1), 'squat-pause', 180, 1, ['lift:squat', 'variation']),
      rec(day(10), 'squat-pause', 200, 1, ['lift:squat', 'variation']),
    ];
    const mNoAddl = fitNormalizationModel(noAddlHistory, { minSamples: 2 }, athlete());
    expect(mNoAddl.variantFactor['squat-pause']?.factor).toBeGreaterThan(0);
    expect(mNoAddl.addlWtOffset['squat-pause']).toBeUndefined();
  });
});

describe('Design C: offsetAdjustRecords pre-derivation (weight-space correction)', () => {
  it('corrects weights, evaluates structural scaling factors, and validates limits', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());

    const raw = rec(day(1), 'bench-chains', 80, 1, ['lift:bench', 'addl:chains']);
    expect(offsetAdjustRecords([raw], model)[0].weight).toBe(100);

    const factor = model.variantFactor['bench-chains'].factor;
    expect(normalizeE1rm('bench-chains', 100, model)).toBeCloseTo(100 / factor, 5);

    const projected = projectToVariant(5, 'bench-chains', model)!;
    expect(projected).toBeCloseTo(5 * factor, 5);
    expect(projected).toBeGreaterThan(0);
  });
});

describe('fitNormalizationModel — Task 3: chain-offset sign fix (fit against straight-canonical grid)', () => {
  it('regression: simple addlWt (no stance/equipment) fits offset unchanged at expected numeric value', () => {
    const model = fitNormalizationModel(history, { minSamples: 1 }, athlete());

    // bench-chains: offset vs comp-lift baseline 'bench' grid
    // grid: day(1)→100, day(10)→110
    // day(1): invertE1RM(100, 1) - 80 = 100 - 80 = 20
    // day(10): invertE1RM(110, 1) - 90 = 110 - 90 = 20
    // average: 20
    expect(model.addlWtOffset['bench-chains']).toEqual({ offsetKg: 20, n: 2 });

    // squat-chains: offset vs comp-lift baseline 'squat' grid
    // grid: day(1)→200, day(10)→220
    // day(1): invertE1RM(200, 1) - 150 = 200 - 150 = 50
    // day(10): invertE1RM(220, 1) - 160 = 220 - 160 = 60
    // average: 55
    expect(model.addlWtOffset['squat-chains']).toEqual({ offsetKg: 55, n: 2 });
  });

  it('compound stance + addlWt: offset fits against matched straight canonical, isolating chains from stance', () => {
    // Build fixture family: plain bench (baseline), slingshot (assistive boost), slingshot+chains (resistive delta)
    const slingshotFixture: TaggedSetRecord[] = [
      // Plain comp-lift baseline
      rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift']),
      rec(day(10), 'bench', 110, 1, ['lift:bench', 'comp-lift']),
      // Slingshot (assistive stance): notably higher than plain bench
      rec(day(1), 'bench-slingshot', 130, 1, ['lift:bench', 'stance:slingshot', 'variation']),
      rec(day(10), 'bench-slingshot', 140, 1, ['lift:bench', 'stance:slingshot', 'variation']),
      // Slingshot + chains: lower than slingshot, simulating chains' resistance
      rec(day(1), 'bench-slingshot-chains', 120, 1, [
        'lift:bench',
        'stance:slingshot',
        'addl:chains',
        'variation',
      ]),
      rec(day(10), 'bench-slingshot-chains', 130, 1, [
        'lift:bench',
        'stance:slingshot',
        'addl:chains',
        'variation',
      ]),
    ];

    const model = fitNormalizationModel(slingshotFixture, { minSamples: 1 }, athlete());

    // Baseline should be plain 'bench'
    expect(model.baseline['lift:bench']).toBe('bench');

    // bench-slingshot should have NO offset (it's addlWt-free)
    expect(model.addlWtOffset['bench-slingshot']).toBeUndefined();

    // bench-slingshot-chains offset: fit against bench-slingshot's grid (not bench's flat baseline)
    // slingshot grid: day(1)→130, day(10)→140
    // day(1): invertE1RM(130, 1) - 120 = 130 - 120 = 10
    // day(10): invertE1RM(140, 1) - 130 = 140 - 130 = 10
    // average: 10 (POSITIVE, not negative — this is the fix)
    expect(model.addlWtOffset['bench-slingshot-chains']).toEqual({ offsetKg: 10, n: 2 });
    expect(model.addlWtOffset['bench-slingshot-chains'].offsetKg).toBeGreaterThan(0);
  });

  it('edge case: addlWt canonical with stance modifier but no addlWt-free sibling leaves offset unfitted', () => {
    // History: plain bench (comp baseline), NO bench-sumo anywhere, only bench-sumo-chains
    const edgeCaseFixture: TaggedSetRecord[] = [
      rec(day(1), 'bench', 100, 1, ['lift:bench', 'comp-lift']),
      rec(day(10), 'bench', 110, 1, ['lift:bench', 'comp-lift']),
      // ONLY slingshot + chains; NO plain slingshot
      rec(day(1), 'bench-sumo-chains', 80, 1, [
        'lift:bench',
        'stance:sumo',
        'addl:chains',
        'variation',
      ]),
      rec(day(10), 'bench-sumo-chains', 90, 1, [
        'lift:bench',
        'stance:sumo',
        'addl:chains',
        'variation',
      ]),
    ];

    const model = fitNormalizationModel(edgeCaseFixture, { minSamples: 1 }, athlete());

    // bench-sumo-chains has no matching straight canonical (no bench-sumo records exist),
    // so offset must NOT be fit and must remain undefined — never fall back to flat baseline.
    expect(model.addlWtOffset['bench-sumo-chains']).toBeUndefined();
  });
});
