import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PipelineModel, VariantAssessment } from '@dyel/api';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';

vi.mock('../../app/PipelineContext');
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);

const rec = (
  canonical: string,
  lift: string,
  overrides?: Partial<VariantAssessment>
): VariantAssessment => ({
  canonical,
  displayName: canonical,
  lift,
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

const mockModel = (variants: VariantAssessment[]): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
  diagnostics: { variants, weaknesses: [], unassessed: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  pointsByDeriver: new Map(),
  pointsByLabelByDeriver: new Map(),
  pointsByDeriverAdjusted: new Map(),
  athlete: { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' },
});

describe('usePipelineDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles empty states, filters liftType contexts, and builds target indicators', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });
    expect(renderHook(() => usePipelineDiagnostics()).result.current).toEqual({
      variants: [],
      hasDeadlift: false,
      weakEffects: [],
      overtrainedEffects: [],
    });

    const dataset = [
      rec('squat', 'lift:squat'),
      rec('bench', 'lift:bench'),
      rec('deadlift', 'lift:deadlift'),
    ];
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: mockModel(dataset) });

    const all = renderHook(() => usePipelineDiagnostics()).result.current;
    const squat = renderHook(() => usePipelineDiagnostics('squat')).result.current;
    const deadlift = renderHook(() => usePipelineDiagnostics('deadlift')).result.current;

    expect(all.variants).toHaveLength(3);
    expect(all.hasDeadlift).toBe(true);

    expect(squat.variants).toHaveLength(1);
    expect(squat.variants[0].canonical).toBe('squat');
    expect(squat.hasDeadlift).toBe(false);

    expect(deadlift.variants[0].canonical).toBe('deadlift');
  });

  it('memoizes array references across identical lifecycle renders', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: mockModel([rec('squat', 'lift:squat')]),
    });
    const { result, rerender } = renderHook(() => usePipelineDiagnostics('squat'));
    const initialArray = result.current.variants;
    rerender();
    expect(result.current.variants).toBe(initialArray);
  });
});
