import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PipelineModel, VariantAssessment } from '@dyel/api';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';

vi.mock('../../app/PipelineContext');

const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);

const buildVariant = (overrides?: Partial<VariantAssessment>): VariantAssessment => ({
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

const buildModel = (overrides?: Partial<PipelineModel>): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
  diagnostics: {
    variants: [buildVariant()],
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
});

describe('usePipelineDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty variants and false hasDeadlift when model is null', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current).toEqual({
      variants: [],
      hasDeadlift: false,
      weakEffects: [],
      overtrainedEffects: [],
    });
  });

  it('wires model through to selector and returns variants', () => {
    const variant = buildVariant({ lift: 'lift:squat' });
    const model = buildModel({
      diagnostics: { variants: [variant], weaknesses: [], unassessed: [] },
    });

    mockUsePipelineModel.mockReturnValue({ status: 'success', model });

    const { result } = renderHook(() => usePipelineDiagnostics());

    expect(result.current.variants).toHaveLength(1);
    expect(result.current.variants[0].canonical).toBe('squat');
  });

  it('filters variants by liftType', () => {
    const variants = [
      buildVariant({ canonical: 'squat', lift: 'lift:squat' }),
      buildVariant({ canonical: 'bench', lift: 'lift:bench' }),
      buildVariant({ canonical: 'deadlift', lift: 'lift:deadlift' }),
    ];
    const model = buildModel({
      diagnostics: { variants, weaknesses: [], unassessed: [] },
    });

    mockUsePipelineModel.mockReturnValue({ status: 'success', model });

    const { result: resultAll } = renderHook(() => usePipelineDiagnostics());
    const { result: resultSquat } = renderHook(() => usePipelineDiagnostics('squat'));
    const { result: resultDeadlift } = renderHook(() => usePipelineDiagnostics('deadlift'));

    expect(resultAll.current.variants).toHaveLength(3);
    expect(resultSquat.current.variants).toHaveLength(1);
    expect(resultSquat.current.variants[0].canonical).toBe('squat');
    expect(resultDeadlift.current.variants[0].canonical).toBe('deadlift');
  });

  it('computes hasDeadlift flag from filtered variants', () => {
    const variants = [
      buildVariant({ lift: 'lift:squat' }),
      buildVariant({ lift: 'lift:deadlift' }),
    ];
    const model = buildModel({
      diagnostics: { variants, weaknesses: [], unassessed: [] },
    });

    mockUsePipelineModel.mockReturnValue({ status: 'success', model });

    const { result: resultAll } = renderHook(() => usePipelineDiagnostics());
    const { result: resultSquatOnly } = renderHook(() => usePipelineDiagnostics('squat'));

    expect(resultAll.current.hasDeadlift).toBe(true);
    expect(resultSquatOnly.current.hasDeadlift).toBe(false);
  });

  it('memoizes variants across renders with unchanged dependencies', () => {
    const variant = buildVariant();
    const model = buildModel({
      diagnostics: { variants: [variant], weaknesses: [], unassessed: [] },
    });

    mockUsePipelineModel.mockReturnValue({ status: 'success', model });

    const { result, rerender } = renderHook(() => usePipelineDiagnostics('squat'));
    const firstVariantsArray = result.current.variants;

    rerender();

    expect(result.current.variants).toBe(firstVariantsArray);
  });
});
