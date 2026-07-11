import { describe, it, expect } from 'vitest';
import type { PipelineModel, VariantAssessment } from '@dyel/pipeline';
import { selectDiagnosticVariants, summarizeEffects } from './diagnosticsSelectors';

const buildFixtureVariant = (overrides?: Partial<VariantAssessment>): VariantAssessment => ({
  canonical: 'squat',
  displayName: 'Squat',
  lift: 'lift:squat',
  expectedE1rmKg: 100,
  actualE1rmKg: 102,
  ratio: 1.02,
  status: 'optimal',
  averageIndex: 100,
  expectedBaseline: '90-110%',
  staleDays: 3,
  effects: ['hypertrophy'],
  addlWtOffset: { offsetKg: 5, n: 10 },
  ...overrides,
});

const buildFixtureModel = (overrides?: Partial<PipelineModel>): PipelineModel => {
  return {
    model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
    diagnostics: {
      variants: [buildFixtureVariant()],
      weaknesses: [],
      unassessed: [],
    },
    unknownExercises: [],
    unnormalized: [],
    parseErrors: [],
    pointsByDeriver: new Map([['e1rm', []]]),
    pointsByLabelByDeriver: new Map([['e1rm', []]]),
    pointsByDeriverAdjusted: new Map([['e1rm', []]]),
    athlete: { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' },
    ...overrides,
  };
};

describe('selectDiagnosticVariants', () => {
  it('extracts all required fields from VariantAssessment', () => {
    const variant = buildFixtureVariant({
      canonical: 'squat',
      displayName: 'Squat (Wraps)',
      lift: 'lift:squat',
      expectedE1rmKg: 150,
      actualE1rmKg: 155,
      ratio: 1.033,
      status: 'overperforming',
      averageIndex: 103.3,
      expectedBaseline: '95-105%',
      staleDays: 1,
      effects: ['hypertrophy', 'strength'],
      addlWtOffset: { offsetKg: 10, n: 20 },
    });

    const fixtureModel = buildFixtureModel({
      diagnostics: {
        variants: [variant],
        weaknesses: [],
        unassessed: [],
      },
    });

    const result = selectDiagnosticVariants(fixtureModel);

    expect(result).toHaveLength(1);
    const mappedVariant = result[0];
    expect(mappedVariant.canonical).toBe('squat');
    expect(mappedVariant.displayName).toBe('Squat (Wraps)');
    expect(mappedVariant.lift).toBe('lift:squat');
    expect(mappedVariant.expectedE1rmKg).toBe(150);
    expect(mappedVariant.actualE1rmKg).toBe(155);
    expect(mappedVariant.ratio).toBe(1.033);
    expect(mappedVariant.status).toBe('overperforming');
    expect(mappedVariant.averageIndex).toBe(103.3);
    expect(mappedVariant.expectedBaseline).toBe('95-105%');
    expect(mappedVariant.staleDays).toBe(1);
    expect(mappedVariant.effects).toEqual(['hypertrophy', 'strength']);
    expect(mappedVariant.addlWtOffset).toEqual({ offsetKg: 10, n: 20 });
  });

  it('handles optional addlWtOffset correctly when undefined', () => {
    const variant = buildFixtureVariant({
      addlWtOffset: undefined,
    });

    const fixtureModel = buildFixtureModel({
      diagnostics: {
        variants: [variant],
        weaknesses: [],
        unassessed: [],
      },
    });

    const result = selectDiagnosticVariants(fixtureModel);

    expect(result).toHaveLength(1);
    expect(result[0].addlWtOffset).toBeUndefined();
  });

  it('handles expectedBaseline null correctly', () => {
    const variant = buildFixtureVariant({
      expectedBaseline: null,
    });

    const fixtureModel = buildFixtureModel({
      diagnostics: {
        variants: [variant],
        weaknesses: [],
        unassessed: [],
      },
    });

    const result = selectDiagnosticVariants(fixtureModel);

    expect(result).toHaveLength(1);
    expect(result[0].expectedBaseline).toBeNull();
  });

  it.each([
    [
      'no liftType → returns all variants unfiltered',
      undefined,
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['squat', 'bench', 'deadlift'],
    ],
    [
      'liftType="squat" with mixed variants → returns only squat',
      'squat',
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['squat'],
    ],
    [
      'liftType="bench" with mixed variants → returns only bench',
      'bench',
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['bench'],
    ],
    [
      'liftType="deadlift" with mixed variants → returns only deadlift',
      'deadlift',
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['deadlift'],
    ],
    [
      'liftType="squat" with no matching variants → returns empty array',
      'squat',
      ['lift:bench', 'lift:deadlift'],
      [],
    ],
  ])('filters variants by liftType: %s', (_, liftType, lifts, expectedCanonicals) => {
    const variants = lifts.map((lift) => {
      const liftName = lift.split(':')[1];
      return buildFixtureVariant({
        canonical: liftName,
        lift,
      });
    });

    const fixtureModel = buildFixtureModel({
      diagnostics: {
        variants,
        weaknesses: [],
        unassessed: [],
      },
    });

    const result = selectDiagnosticVariants(fixtureModel, liftType);

    expect(result).toHaveLength(expectedCanonicals.length);
    expect(result.map((v) => v.canonical)).toEqual(expectedCanonicals);
  });

  it('handles multiple variants with mixed properties', () => {
    const variants = [
      buildFixtureVariant({
        canonical: 'squat',
        displayName: 'Squat',
        lift: 'lift:squat',
        status: 'optimal',
        expectedBaseline: '90-110%',
        addlWtOffset: { offsetKg: 5, n: 10 },
      }),
      buildFixtureVariant({
        canonical: 'bench',
        displayName: 'Bench Press',
        lift: 'lift:bench',
        status: 'weakness',
        expectedBaseline: null,
        addlWtOffset: undefined,
      }),
      buildFixtureVariant({
        canonical: 'deadlift',
        displayName: 'Deadlift',
        lift: 'lift:deadlift',
        status: 'overperforming',
        expectedBaseline: '95-105%',
        addlWtOffset: { offsetKg: 15, n: 8 },
      }),
    ];

    const fixtureModel = buildFixtureModel({
      diagnostics: {
        variants,
        weaknesses: [],
        unassessed: [],
      },
    });

    const result = selectDiagnosticVariants(fixtureModel);

    expect(result).toHaveLength(3);

    // Verify each variant maintains its own properties
    expect(result[0].displayName).toBe('Squat');
    expect(result[0].expectedBaseline).toBe('90-110%');
    expect(result[0].addlWtOffset).toEqual({ offsetKg: 5, n: 10 });

    expect(result[1].displayName).toBe('Bench Press');
    expect(result[1].expectedBaseline).toBeNull();
    expect(result[1].addlWtOffset).toBeUndefined();

    expect(result[2].displayName).toBe('Deadlift');
    expect(result[2].expectedBaseline).toBe('95-105%');
    expect(result[2].addlWtOffset).toEqual({ offsetKg: 15, n: 8 });
  });
});

describe('summarizeEffects', () => {
  it.each([
    [
      'single weakness, single effect',
      [buildFixtureVariant({ status: 'weakness', effects: ['strength'] })],
      { weakEffects: ['strength'], overtrainedEffects: [] },
    ],
    [
      'single overperforming, single effect',
      [buildFixtureVariant({ status: 'overperforming', effects: ['hypertrophy'] })],
      { weakEffects: [], overtrainedEffects: ['hypertrophy'] },
    ],
    [
      'equal weakness and overperforming → balanced effect omitted',
      [
        buildFixtureVariant({ status: 'weakness', effects: ['hypertrophy'] }),
        buildFixtureVariant({ status: 'overperforming', effects: ['hypertrophy'] }),
      ],
      { weakEffects: [], overtrainedEffects: [] },
    ],
    [
      'multiple variants same effect, net weakness',
      [
        buildFixtureVariant({ status: 'weakness', effects: ['power'] }),
        buildFixtureVariant({ status: 'weakness', effects: ['power'] }),
        buildFixtureVariant({ status: 'overperforming', effects: ['power'] }),
      ],
      { weakEffects: ['power'], overtrainedEffects: [] },
    ],
    [
      'multiple variants multiple effects',
      [
        buildFixtureVariant({ status: 'weakness', effects: ['hypertrophy', 'strength'] }),
        buildFixtureVariant({ status: 'overperforming', effects: ['speed', 'power'] }),
        buildFixtureVariant({ status: 'overperforming', effects: ['hypertrophy'] }),
      ],
      { weakEffects: ['strength'], overtrainedEffects: ['speed', 'power'] },
    ],
    [
      'optimal status skipped (not weakness or overperforming)',
      [
        buildFixtureVariant({ status: 'optimal', effects: ['hypertrophy'] }),
        buildFixtureVariant({ status: 'stale', effects: ['strength'] }),
      ],
      { weakEffects: [], overtrainedEffects: [] },
    ],
    ['empty variants array', [], { weakEffects: [], overtrainedEffects: [] }],
  ])('summarizes effects correctly: %s', (_, variants, expected) => {
    expect(summarizeEffects(variants)).toEqual(expected);
  });

  it('collects all weak effects correctly', () => {
    const variants = [
      buildFixtureVariant({ status: 'weakness', effects: ['strength'] }),
      buildFixtureVariant({ status: 'weakness', effects: ['power'] }),
      buildFixtureVariant({ status: 'weakness', effects: ['endurance'] }),
    ];

    const result = summarizeEffects(variants);

    expect(result.weakEffects).toHaveLength(3);
    expect(new Set(result.weakEffects)).toEqual(new Set(['strength', 'power', 'endurance']));
    expect(result.overtrainedEffects).toHaveLength(0);
  });

  it('collects all overtrained effects correctly', () => {
    const variants = [
      buildFixtureVariant({ status: 'overperforming', effects: ['hypertrophy'] }),
      buildFixtureVariant({ status: 'overperforming', effects: ['speed'] }),
    ];

    const result = summarizeEffects(variants);

    expect(result.weakEffects).toHaveLength(0);
    expect(result.overtrainedEffects).toHaveLength(2);
    expect(new Set(result.overtrainedEffects)).toEqual(new Set(['hypertrophy', 'speed']));
  });
});
