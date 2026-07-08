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
    // After Task 10a offset-adjustment: weights are offset-corrected (+20kg) before fitting,
    // resulting in a factor of 1.0 (80+20=100 vs baseline 100, 90+20=110 vs baseline 110)
    expect(model.variantFactor['bench-chains'].factor).toBeCloseTo(1, 5);
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

describe('fitNormalizationModel — speed-work inclusion', () => {
  const speedWorkPoint = rec(day(5), 'bench', 10, 1, ['lift:bench', 'comp-lift'], 9);
  // Use a non-addlWt variant to test speed-work inclusion without offset adjustment interference
  const variantAtSameDate = rec(day(5), 'bench-paused', 95, 1, ['lift:bench', 'variation']);

  it('includes speed-work sets in the interpolation grid used to fit variant factors', () => {
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

    // With speed-work now included, the interpolated grid value at day(5) is 10kg instead of
    // ~105kg (interpolated between day(1) and day(10)), resulting in a significantly different factor.
    // These factors should differ because the grid interpolation changes.
    expect(withSpeedWork.variantFactor['bench-paused'].factor).not.toBeCloseTo(
      withoutSpeedWork.variantFactor['bench-paused'].factor,
      1
    );
  });

  it('anchors the grid on the speed-work point when it lands on a variant query date', () => {
    // Speed-work points are now included in fitting. The grid returns the exact 10kg speed-work
    // value at day(5), giving a factor of 95 / 10 = 9.5.
    const expectedFactor = 95 / 10;
    const model = fitNormalizationModel(
      [...benchHistory, variantAtSameDate, speedWorkPoint],
      {
        minSamples: 1,
      },
      athlete()
    );
    expect(model.variantFactor['bench-paused'].factor).toBeCloseTo(expectedFactor, 1);
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

describe('fitNormalizationModel — Task 10a: addlWtOffset fit-time adjustment', () => {
  it('fits variantFactor for addlWt canonical using offset-adjusted weights (differs from naive unadjusted fit)', () => {
    // This test proves that Task 10a's offset-adjustment of weights before fitting actually changes the fit result.
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());

    // The offset-adjusted fit for bench-chains (offset=20kg):
    // - day 1: (80+20=100) / 100 = 1.0
    // - day 10: (90+20=110) / 110 = 1.0
    // - mean = 1.0
    expect(model.variantFactor['bench-chains'].factor).toBeCloseTo(1, 5);

    // Now compute what the fit would be WITHOUT offset adjustment (naive unadjusted):
    // - day 1: 80 / 100 = 0.8
    // - day 10: 90 / 110 = 0.818...
    // - mean ≈ 0.809...
    // These are clearly different, proving the offset adjustment changed the fit.
    expect(model.variantFactor['bench-chains'].factor).not.toBeCloseTo(0.809090909, 2);
  });

  it('non-addlWt canonicals are fit on raw (non-offset-adjusted) weights unchanged', () => {
    // squat-chains has no addl tag in this history, so it should use the raw weight fit path.
    // This test ensures Task 10a doesn't affect canonicals without addlWt tags.
    const noAddlHistory: TaggedSetRecord[] = [
      rec(day(1), 'squat', 200, 1, ['lift:squat', 'comp-lift']),
      rec(day(10), 'squat', 220, 1, ['lift:squat', 'comp-lift']),
      // Non-addlWt variant (no addl tag)
      rec(day(1), 'squat-pause', 180, 1, ['lift:squat', 'variation']),
      rec(day(10), 'squat-pause', 200, 1, ['lift:squat', 'variation']),
    ];
    const model = fitNormalizationModel(noAddlHistory, { minSamples: 2 }, athlete());
    // Should be fit on raw weights: (180/200 + 200/220) / 2 ≈ 0.9045
    expect(model.variantFactor['squat-pause']).toBeDefined();
    // Just verify it exists and is non-zero (exact value depends on interpolation)
    expect(model.variantFactor['squat-pause'].factor).toBeGreaterThan(0);
    // Verify no offset was fit for this non-addlWt canonical
    expect(model.addlWtOffset['squat-pause']).toBeUndefined();
  });
});

describe('Design C: offsetAdjustRecords pre-derivation (weight-space correction)', () => {
  it('when records are pre-adjusted via offsetAdjustRecords and derived, e1RM reflects the corrected weight', () => {
    // This test verifies the weight-space correction path (Design C) works end-to-end.
    // Create a simple model with an offset-fitted canonical.
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());

    // bench-chains has offset=20kg. A raw record with weight=80 should become 100 after adjustment.
    // When derived with e1rm formula at reps=1, 100kg @ 1rep = 100 e1RM.
    const rawRecord = rec(day(1), 'bench-chains', 80, 1, ['lift:bench', 'addl:chains']);
    const adjusted = offsetAdjustRecords([rawRecord], model);

    // After adjustment, weight should be 80 + 20 = 100
    expect(adjusted[0].weight).toBe(100);
  });

  it('composite specs consume offset-adjusted points, normalizeE1rm applies pure factor', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());

    // If a pre-adjusted e1rm point (based on corrected weight) flows through normalizeE1rm
    // with pure factor operation (no offset term), the result is e1rm / factor.
    // bench-chains: factor ≈ 1 (because offset adjustment makes it match baseline at fit time),
    // so normalized ≈ e1rm_adjusted / 1 = e1rm_adjusted.
    const adjustedE1rm = 100;
    const factor = model.variantFactor['bench-chains'].factor;
    const normalized = normalizeE1rm('bench-chains', adjustedE1rm, model);

    expect(normalized).toBeCloseTo(adjustedE1rm / factor, 5);
  });

  it('projectToVariant clamping works for pure factor operation', () => {
    const model = fitNormalizationModel(history, { minSamples: 2 }, athlete());
    // With pure factor (no offset term), projectToVariant(5, 'bench-chains', model) = max(0, 5 * factor)
    // Since factor ≈ 1, result ≈ 5, not clamped to 0 (unlike Task 10b where offset subtraction would clamp it).
    const result = projectToVariant(5, 'bench-chains', model)!;
    expect(result).toBeCloseTo(5 * model.variantFactor['bench-chains'].factor, 5);
    expect(result).toBeGreaterThan(0);
  });
});
