import { describe, it, expect } from 'vitest';
import { createPipelinePointStore } from '@dyel/pipeline';
import type { PipelineModel, VariantAssessment } from '@dyel/pipeline';
import {
  selectDiagnosticVariants,
  selectUnassessedDiagnostics,
  summarizeEffects,
  summarizeDiagnosticAttention,
  summarizeDiagnosticEffectEvidence,
  summarizeDiagnosticEvidence,
} from './diagnosticsSelectors';

const baseVariant = (overrides?: Partial<VariantAssessment>): VariantAssessment => ({
  canonical: 'squat',
  displayName: 'Squat',
  lift: 'lift:squat',
  expectedE1rmKg: 100,
  actualE1rmKg: 102,
  baselineE1rmKg: 100,
  expectedFactor: 1,
  latestAt: 1000,
  latestSet: { weight: 100, reps: 3, rpe: 9 },
  previousE1rmKg: 98,
  observationCount: 4,
  comparisonCount: null,
  ratio: 1.02,
  status: 'optimal',
  fittedStatus: 'optimal',
  averageIndex: 100,
  expectedBaseline: '90-110%',
  staleDays: 3,
  effects: ['hypertrophy'],
  isCompLift: true,
  addlWtOffset: { offsetKg: 5, n: 10 },
  ...overrides,
});

const baseModel = (
  variants: VariantAssessment[],
  unassessed: PipelineModel['diagnostics']['unassessed'] = []
): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {}, fittedAt: 0 },
  diagnostics: { variants, weaknesses: [], unassessed },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  points: createPipelinePointStore({ canonical: new Map([['e1rm', []]]) }),
  tagged: [],
  athlete: { sex: 'M', bodyweight: 90 },
});

describe('selectUnassessedDiagnostics', () => {
  const items: PipelineModel['diagnostics']['unassessed'] = [
    {
      canonical: 'squat-pause',
      displayName: 'Pause Squat',
      lift: 'lift:squat',
      reason: 'missing-factor',
    },
    {
      canonical: 'bench-bands',
      displayName: 'Bench (Bands)',
      lift: 'lift:bench',
      reason: 'missing-baseline',
    },
    { canonical: 'unknown', displayName: 'Unknown', lift: null, reason: 'missing-lift' },
  ];

  it('returns all items without a lift scope and matching items with one', () => {
    expect(selectUnassessedDiagnostics(baseModel([], items))).toEqual(items);
    expect(selectUnassessedDiagnostics(baseModel([], items), 'bench')).toEqual([items[1]]);
    expect(selectUnassessedDiagnostics(baseModel([], items), 'accessory')).toEqual([items[2]]);
  });
});

describe('selectDiagnosticVariants', () => {
  it('extracts all required fields from VariantAssessment', () => {
    const v = baseVariant({
      canonical: 'squat',
      displayName: 'Squat (Wraps)',
      lift: 'lift:squat',
      expectedE1rmKg: 150,
      actualE1rmKg: 155,
      latestSet: { weight: 140, reps: 3, rpe: 9 },
      ratio: 1.033,
      status: 'overperforming',
      fittedStatus: 'optimal',
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

describe('summarizeDiagnosticAttention', () => {
  it.each([
    ['empty input', [], { belowCount: 0, aboveCount: 0, leadingBelowEffect: null }],
    [
      'mixed current findings while excluding stale and optimal rows',
      [
        baseVariant({ status: 'weakness', effects: ['power', 'strength'] }),
        baseVariant({ status: 'weakness', effects: ['power'] }),
        baseVariant({ status: 'overperforming', effects: ['speed'] }),
        baseVariant({ status: 'stale', effects: ['power'] }),
        baseVariant({ status: 'optimal', effects: ['power'] }),
      ],
      { belowCount: 2, aboveCount: 1, leadingBelowEffect: { effect: 'power', count: 2 } },
    ],
    [
      'all in range',
      [baseVariant({ status: 'optimal' }), baseVariant({ status: 'optimal' })],
      { belowCount: 0, aboveCount: 0, leadingBelowEffect: null },
    ],
    [
      'deterministic alphabetical tie breaking',
      [
        baseVariant({ status: 'weakness', effects: ['strength'] }),
        baseVariant({ status: 'weakness', effects: ['power'] }),
      ],
      { belowCount: 2, aboveCount: 0, leadingBelowEffect: { effect: 'power', count: 1 } },
    ],
  ])('%s', (_, variants, expected) => {
    expect(summarizeDiagnosticAttention(variants)).toEqual(expected);
  });
});

describe('summarizeDiagnosticEvidence', () => {
  it('is the authoritative ordered summary for current and conflicting evidence', () => {
    expect(
      summarizeDiagnosticEvidence([
        baseVariant({ status: 'weakness', effects: ['strength', 'power'] }),
        baseVariant({ status: 'weakness', effects: ['power'] }),
        baseVariant({ status: 'overperforming', effects: ['power', 'speed'] }),
        baseVariant({ status: 'stale', effects: ['power'] }),
        baseVariant({ status: 'optimal', effects: ['power'] }),
      ])
    ).toMatchObject({
      belowCount: 2,
      aboveCount: 1,
      leadingBelowEffect: { effect: 'power', count: 2 },
      effects: [
        { effect: 'power', belowCount: 2, aboveCount: 1 },
        { effect: 'speed', belowCount: 0, aboveCount: 1 },
        { effect: 'strength', belowCount: 1, aboveCount: 0 },
      ],
      rankedFindings: expect.arrayContaining([
        expect.objectContaining({ canonical: 'squat', priorityScore: expect.any(Number) }),
      ]),
    });
  });

  it('ranks by magnitude and evidence while handling ties, contradictions, stale, and sparse data', () => {
    const findings = summarizeDiagnosticEvidence([
      baseVariant({
        canonical: 'large',
        displayName: 'Large',
        status: 'weakness',
        ratio: 0.75,
        effects: ['power'],
        observationCount: 5,
        comparisonCount: 5,
        staleDays: 2,
      }),
      baseVariant({
        canonical: 'small',
        displayName: 'Small',
        status: 'weakness',
        ratio: 0.9,
        effects: ['power'],
        observationCount: 1,
        comparisonCount: 1,
        staleDays: 80,
      }),
      baseVariant({
        canonical: 'opposite',
        displayName: 'Opposite',
        status: 'overperforming',
        ratio: 1.1,
        effects: ['power'],
        observationCount: 3,
        comparisonCount: 3,
        staleDays: 2,
      }),
      baseVariant({
        canonical: 'stale',
        status: 'stale',
        ratio: 0.5,
        effects: ['power'],
        staleDays: 120,
      }),
      baseVariant({
        canonical: 'tie-b',
        status: 'weakness',
        ratio: 0.9,
        effects: [],
        observationCount: 1,
        comparisonCount: 1,
        staleDays: 30,
      }),
      baseVariant({
        canonical: 'tie-a',
        status: 'weakness',
        ratio: 0.9,
        effects: [],
        observationCount: 1,
        comparisonCount: 1,
        staleDays: 30,
      }),
    ]).rankedFindings;

    expect(findings[0].canonical).toBe('large');
    expect(findings.find((finding) => finding.canonical === 'small')?.confidence).toBe('limited');
    expect(findings.some((finding) => finding.canonical === 'stale')).toBe(false);
    expect(findings.find((finding) => finding.canonical === 'large')?.relatedCount).toBe(3);
    expect(findings.findIndex((finding) => finding.canonical === 'tie-a')).toBeLessThan(
      findings.findIndex((finding) => finding.canonical === 'tie-b')
    );
  });
});

describe('summarizeDiagnosticEffectEvidence', () => {
  it('preserves supporting and conflicting counts while excluding stale and optimal rows', () => {
    expect(
      summarizeDiagnosticEffectEvidence([
        baseVariant({ status: 'weakness', effects: ['power', 'strength'] }),
        baseVariant({ status: 'weakness', effects: ['power'] }),
        baseVariant({ status: 'overperforming', effects: ['power', 'speed'] }),
        baseVariant({ status: 'stale', effects: ['power'] }),
        baseVariant({ status: 'optimal', effects: ['power'] }),
      ])
    ).toEqual([
      { effect: 'power', belowCount: 2, aboveCount: 1 },
      { effect: 'speed', belowCount: 0, aboveCount: 1 },
      { effect: 'strength', belowCount: 1, aboveCount: 0 },
    ]);
  });

  it('returns an empty list without actionable evidence', () => {
    expect(summarizeDiagnosticEffectEvidence([])).toEqual([]);
  });
});
