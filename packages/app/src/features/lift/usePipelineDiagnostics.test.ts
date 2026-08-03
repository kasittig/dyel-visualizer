import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { buildPipelineModel } from '@dyel/api';
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
      effectEvidence: [],
      needsData: [],
      attentionSummary: {
        belowCount: 0,
        aboveCount: 0,
        leadingBelowEffectDisplay: null,
        leadingBelowEffectCount: 0,
      },
      priorityFindings: [],
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

  it('formats and scopes actionable unassessed reasons', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: {
          variants: [],
          weaknesses: [],
          unassessed: [
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
          ],
        },
      }),
    });

    expect(renderHook(() => usePipelineDiagnostics('bench')).result.current.needsData).toEqual([
      expect.objectContaining({
        canonical: 'bench-bands',
        reasonDisplay: 'Needs competition baseline',
        actionDisplay: 'Log a recent competition-lift set for this lift.',
      }),
    ]);
  });

  it('renders production unknown-exercise findings in the accessory scope', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: buildPipelineModel(
        [{ name: 'log.txt', content: '2024-01-01 Mystery Press 50kg x5 @8' }],
        { sex: 'M', bodyweight: 90 }
      ),
    });

    expect(renderHook(() => usePipelineDiagnostics('accessory')).result.current.needsData).toEqual([
      expect.objectContaining({
        displayName: 'Mystery Press',
        lift: null,
        reason: 'missing-lift',
        reasonDisplay: 'Lift not recognized',
      }),
    ]);
    expect(renderHook(() => usePipelineDiagnostics('bench')).result.current.needsData).toEqual([]);
  });

  it.each([
    ['lbs', '220 lbs', 'Speed-Strength, Mid-Range, +11.0lbs'],
    ['kg', '100 kg', 'Speed-Strength, Mid-Range, +5.0kg'],
  ] as const)('formats diagnostic rows in %s', (unit, actual, effectsDisplay) => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: {
          variants: [
            variantAssessmentMock({
              effects: ['speed-strength', 'mid-range'],
              actualE1rmKg: 100,
              expectedE1rmKg: 109,
              baselineE1rmKg: 120,
              expectedFactor: 0.95,
              latestAt: Date.UTC(2026, 0, 10),
              latestSet: { weight: 100, reps: 3, rpe: 9, sets: 1 },
              previousE1rmKg: 95,
              comparisonCount: 3,
              ratio: 0.9,
              status: 'weakness',
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
      expectedE1rmDisplay: unit === 'lbs' ? '240 lbs' : '109 kg',
      deltaPercent: expect.closeTo(-10),
      deltaDisplay: '-10.0%',
      ageDays: 3,
      ageDisplay: '3 days ago',
      latestDateDisplay: 'Jan 10, 2026',
      latestSetDisplay: unit === 'lbs' ? '220 lbs × 3 @9' : '100 kg × 3 @9',
      trendDisplay: '+5.3% vs prior observation',
      observationDisplay: '4 observations · 3 fitted comparisons',
      calculationDisplay:
        unit === 'lbs'
          ? '264.6 lbs baseline × 95.0% − 11.0 lbs added resistance = 240.4 lbs expected'
          : '120.0 kg baseline × 95.0% − 5.0 kg added resistance = 109.0 kg expected',
      rationaleDisplay: 'The latest e1RM is 10.0% below its expected value.',
    });
  });

  it('renders reverse-band offsets as added assistance', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: {
          variants: [
            variantAssessmentMock({
              actualE1rmKg: 105,
              expectedE1rmKg: 105,
              baselineE1rmKg: 100,
              expectedFactor: 1,
              addlWtOffset: { offsetKg: -5, n: 1 },
            }),
          ],
          weaknesses: [],
          unassessed: [],
        },
      }),
    });

    expect(
      renderHook(() => usePipelineDiagnostics('squat', 'kg')).result.current.variants[0]
        .calculationDisplay
    ).toBe('100.0 kg baseline × 100.0% + 5.0 kg band assistance = 105.0 kg expected');
  });

  it('describes an isolated finding without an empty agreement ratio', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: {
          variants: [
            variantAssessmentMock({
              canonical: 'isolated',
              status: 'weakness',
              ratio: 0.8,
              effects: ['power'],
            }),
          ],
          weaknesses: [],
          unassessed: [],
        },
      }),
    });

    expect(
      renderHook(() => usePipelineDiagnostics()).result.current.priorityFindings[0].detail
    ).toBe('Associated effects: Power · No related signals');
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
