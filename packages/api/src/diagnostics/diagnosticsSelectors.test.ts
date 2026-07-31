import { describe, it, expect } from 'vitest';
import { createPipelinePointStore } from '@dyel/pipeline';
import type { PipelineModel, VariantAssessment } from '@dyel/pipeline';
import { selectDiagnosticVariants, summarizeEffects } from './diagnosticsSelectors';

const baseVariant = (overrides?: Partial<VariantAssessment>): VariantAssessment => ({
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
  isCompLift: true,
  addlWtOffset: { offsetKg: 5, n: 10 },
  ...overrides,
});

const baseModel = (variants: VariantAssessment[]): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {}, fittedAt: 0 },
  diagnostics: { variants, weaknesses: [], unassessed: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  points: createPipelinePointStore({ canonical: new Map([['e1rm', []]]) }),
  tagged: [],
  athlete: { sex: 'M', bodyweight: 90 },
});

describe('selectDiagnosticVariants', () => {
  it('extracts all required fields from VariantAssessment', () => {
    const v = baseVariant({
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
    expect(selectDiagnosticVariants(baseModel([v]))[0]).toEqual(v);
  });

  it('handles optional field boundaries', () => {
    const res = selectDiagnosticVariants(
      baseModel([baseVariant({ addlWtOffset: undefined, expectedBaseline: null })])
    )[0];
    expect(res.addlWtOffset).toBeUndefined();
    expect(res.expectedBaseline).toBeNull();
  });

  it.each([
    [
      'no liftType',
      undefined,
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['squat', 'bench', 'deadlift'],
    ],
    ['filter squat', 'squat', ['lift:squat', 'lift:bench', 'lift:deadlift'], ['squat']],
    ['filter bench', 'bench', ['lift:squat', 'lift:bench', 'lift:deadlift'], ['bench']],
    ['filter deadlift', 'deadlift', ['lift:squat', 'lift:bench', 'lift:deadlift'], ['deadlift']],
    ['no matches', 'squat', ['lift:bench', 'lift:deadlift'], []],
  ])('filters variants by liftType: %s', (_, liftType, lifts, expected) => {
    const variants = lifts.map((lift) => baseVariant({ canonical: lift.split(':')[1], lift }));
    const result = selectDiagnosticVariants(baseModel(variants), liftType);
    expect(result.map((v) => v.canonical)).toEqual(expected);
  });

  it('maintains distinct properties across multiple items', () => {
    const variants = [
      baseVariant({ canonical: 'squat', displayName: 'Squat' }),
      baseVariant({
        canonical: 'bench',
        displayName: 'Bench Press',
        expectedBaseline: null,
        addlWtOffset: undefined,
      }),
    ];
    const result = selectDiagnosticVariants(baseModel(variants));
    expect(result[0].displayName).toBe('Squat');
    expect(result[1].expectedBaseline).toBeNull();
  });

  it.each([
    ['isCompLift: true', true],
    ['isCompLift: false', false],
  ])('passes through isCompLift unchanged: %s', (_, isCompLift) => {
    const v = baseVariant({ isCompLift });
    const result = selectDiagnosticVariants(baseModel([v]))[0];
    expect(result.isCompLift).toBe(isCompLift);
  });
});

describe('summarizeEffects', () => {
  it.each([
    [
      'single weakness',
      [baseVariant({ status: 'weakness', effects: ['strength'] })],
      { weakEffects: ['strength'], overtrainedEffects: [] },
    ],
    [
      'single overperforming',
      [baseVariant({ status: 'overperforming', effects: ['hypertrophy'] })],
      { weakEffects: [], overtrainedEffects: ['hypertrophy'] },
    ],
    [
      'equal cancellation',
      [
        baseVariant({ status: 'weakness', effects: ['hypertrophy'] }),
        baseVariant({ status: 'overperforming', effects: ['hypertrophy'] }),
      ],
      { weakEffects: [], overtrainedEffects: [] },
    ],
    [
      'net weakness math',
      [
        baseVariant({ status: 'weakness', effects: ['power'] }),
        baseVariant({ status: 'weakness', effects: ['power'] }),
        baseVariant({ status: 'overperforming', effects: ['power'] }),
      ],
      { weakEffects: ['power'], overtrainedEffects: [] },
    ],
    [
      'mixed types',
      [
        baseVariant({ status: 'weakness', effects: ['hypertrophy', 'strength'] }),
        baseVariant({ status: 'overperforming', effects: ['speed'] }),
        baseVariant({ status: 'overperforming', effects: ['hypertrophy'] }),
      ],
      { weakEffects: ['strength'], overtrainedEffects: ['speed'] },
    ],
    [
      'skips unassessed states',
      [
        baseVariant({ status: 'optimal', effects: ['hypertrophy'] }),
        baseVariant({ status: 'stale', effects: ['strength'] }),
      ],
      { weakEffects: [], overtrainedEffects: [] },
    ],
    ['empty input', [], { weakEffects: [], overtrainedEffects: [] }],
  ])('%s', (_, variants, expected) => {
    expect(summarizeEffects(variants)).toEqual(expected);
  });

  it('aggregates individual collection buckets', () => {
    const w = summarizeEffects([
      baseVariant({ status: 'weakness', effects: ['strength', 'power'] }),
    ]);
    expect(new Set(w.weakEffects)).toEqual(new Set(['strength', 'power']));

    const o = summarizeEffects([
      baseVariant({ status: 'overperforming', effects: ['hypertrophy', 'speed'] }),
    ]);
    expect(new Set(o.overtrainedEffects)).toEqual(new Set(['hypertrophy', 'speed']));
  });
});
