import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';
import { variantAssessmentMock, pipelineModelMock } from '../../test/helpers/pipelineModelFactory';

vi.mock('../../app/PipelineContext');
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);

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
      variantAssessmentMock({ canonical: 'squat', displayName: 'squat', lift: 'lift:squat' }),
      variantAssessmentMock({ canonical: 'bench', displayName: 'bench', lift: 'lift:bench' }),
      variantAssessmentMock({
        canonical: 'deadlift',
        displayName: 'deadlift',
        lift: 'lift:deadlift',
      }),
    ];
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: { variants: dataset, weaknesses: [], unassessed: [] },
      }),
    });

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
      model: pipelineModelMock({
        diagnostics: {
          variants: [
            variantAssessmentMock({ canonical: 'squat', displayName: 'squat', lift: 'lift:squat' }),
          ],
          weaknesses: [],
          unassessed: [],
        },
      }),
    });
    const { result, rerender } = renderHook(() => usePipelineDiagnostics('squat'));
    const initialArray = result.current.variants;
    rerender();
    expect(result.current.variants).toBe(initialArray);
  });
});
