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

  it.each([
    ['lbs', '220 lbs', '243 lbs', 'Speed-Strength, Mid-Range, +11.0lbs'],
    ['kg', '100 kg', '110 kg', 'Speed-Strength, Mid-Range, +5.0kg'],
  ] as const)('formats diagnostic rows in %s', (unit, actual, expected, effectsDisplay) => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: {
          variants: [
            variantAssessmentMock({
              effects: ['speed-strength', 'mid-range'],
              actualE1rmKg: 100,
              expectedE1rmKg: 110,
              ratio: 0.9,
              staleDays: 3.9,
            }),
          ],
          weaknesses: [],
          unassessed: [],
        },
      }),
    });

    expect(
      renderHook(() => usePipelineDiagnostics('squat', unit)).result.current.variants[0]
    ).toMatchObject({
      effectsDisplay,
      actualE1rmDisplay: actual,
      expectedE1rmDisplay: expected,
      deltaPercent: expect.closeTo(-10),
      deltaDisplay: '-10.0%',
      ageDays: 3,
      ageDisplay: '3 days ago',
    });
  });

  it.each([
    [1.025, 0, 2.5, '+2.5%', 'Today'],
    [1, 1.8, 0, '0.0%', '1 day ago'],
  ])(
    'derives signed delta and recency from ratio %s',
    (ratio, staleDays, delta, display, ageDisplay) => {
      mockUsePipelineModel.mockReturnValue({
        status: 'success',
        model: pipelineModelMock({
          diagnostics: {
            variants: [variantAssessmentMock({ ratio, staleDays })],
            weaknesses: [],
            unassessed: [],
          },
        }),
      });

      expect(renderHook(() => usePipelineDiagnostics()).result.current.variants[0]).toMatchObject({
        deltaPercent: expect.closeTo(delta),
        deltaDisplay: display,
        ageDays: Math.floor(staleDays),
        ageDisplay,
      });
    }
  );
});
