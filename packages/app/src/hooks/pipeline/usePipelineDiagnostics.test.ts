import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PipelineModel, VariantAssessment } from '@dyel/api';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';

vi.mock('../../context/PipelineContext');

const mockUsePipelineModel = vi.mocked(
  (await import('../../context/PipelineContext')).usePipelineModel
);

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

describe('usePipelineDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty variants and false hasDeadlift when model is null', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'loading',
      model: null,
    });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current).toEqual({ variants: [], hasDeadlift: false });
  });

  it('passes through all fields from VariantAssessment', () => {
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

    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current.variants).toHaveLength(1);
    const mappedVariant = result.current.variants[0];
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

    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current.variants).toHaveLength(1);
    expect(result.current.variants[0].addlWtOffset).toBeUndefined();
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

    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current.variants).toHaveLength(1);
    expect(result.current.variants[0].expectedBaseline).toBeNull();
  });

  it.each([
    ['squat with deadlift', ['lift:squat', 'lift:deadlift'], true],
    ['bench and deadlift', ['lift:bench', 'lift:deadlift'], true],
    ['deadlift only', ['lift:deadlift'], true],
    ['squat only', ['lift:squat'], false],
    ['bench only', ['lift:bench'], false],
    ['multiple without deadlift', ['lift:squat', 'lift:bench'], false],
  ])('computes hasDeadlift correctly: %s', (_, lifts, expectedHasDeadlift) => {
    const variants = lifts.map((lift, idx) => {
      const liftType = lift.includes('deadlift') ? 'deadlift' : lift.split(':')[1];
      return buildFixtureVariant({
        canonical: `${liftType}_variant_${idx}`,
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

    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current.hasDeadlift).toBe(expectedHasDeadlift);
  });

  it.each([
    [
      'no liftType → returns all variants unfiltered',
      undefined,
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['squat', 'bench', 'deadlift'],
      true,
    ],
    [
      'liftType="squat" with mixed variants → returns only squat, hasDeadlift false',
      'squat',
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['squat'],
      false,
    ],
    [
      'liftType="bench" with mixed variants → returns only bench, hasDeadlift false',
      'bench',
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['bench'],
      false,
    ],
    [
      'liftType="deadlift" with mixed variants → returns only deadlift, hasDeadlift true',
      'deadlift',
      ['lift:squat', 'lift:bench', 'lift:deadlift'],
      ['deadlift'],
      true,
    ],
    [
      'liftType="squat" with no matching variants → returns empty array, hasDeadlift false',
      'squat',
      ['lift:bench', 'lift:deadlift'],
      [],
      false,
    ],
  ])(
    'filters variants by liftType: %s',
    (_, liftType, lifts, expectedCanonicals, expectedHasDeadlift) => {
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

      mockUsePipelineModel.mockReturnValue({
        status: 'success',
        model: fixtureModel,
      });

      const { result } = renderHook(() => usePipelineDiagnostics(liftType));

      expect(result.current.variants).toHaveLength(expectedCanonicals.length);
      expect(result.current.variants.map((v) => v.canonical)).toEqual(expectedCanonicals);
      expect(result.current.hasDeadlift).toBe(expectedHasDeadlift);
    }
  );

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

    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: fixtureModel,
    });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current.variants).toHaveLength(3);
    expect(result.current.hasDeadlift).toBe(true);

    // Verify each variant maintains its own properties
    expect(result.current.variants[0].displayName).toBe('Squat');
    expect(result.current.variants[0].expectedBaseline).toBe('90-110%');
    expect(result.current.variants[0].addlWtOffset).toEqual({ offsetKg: 5, n: 10 });

    expect(result.current.variants[1].displayName).toBe('Bench Press');
    expect(result.current.variants[1].expectedBaseline).toBeNull();
    expect(result.current.variants[1].addlWtOffset).toBeUndefined();

    expect(result.current.variants[2].displayName).toBe('Deadlift');
    expect(result.current.variants[2].expectedBaseline).toBe('95-105%');
    expect(result.current.variants[2].addlWtOffset).toEqual({ offsetKg: 15, n: 8 });
  });
});
