import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaggedSetRecord } from '@dyel/api';
import { pipelineModelMock, variantAssessmentMock } from '../../test/helpers/pipelineModelFactory';
import { useWeaknessAccessoryCoverage } from './useWeaknessAccessoryCoverage';

vi.mock('../../app/PipelineContext');
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);
const range = { from: new Date(2026, 7, 1), to: new Date(2026, 7, 31) };
const accessory = (exercise: string, date: number): TaggedSetRecord => ({
  date,
  exercise,
  canonical: exercise.toLowerCase().replaceAll(' ', '-'),
  weight: 0,
  reps: 20,
  rpe: null,
  effects: [],
  baselineRange: null,
  meta: { rawExercise: exercise },
  tags: new Set(['lift:accessory']),
});

describe('useWeaknessAccessoryCoverage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns no rows before a model is available', () => {
    mockUsePipelineModel.mockReturnValue({ status: 'loading', model: null });
    expect(renderHook(() => useWeaknessAccessoryCoverage(range)).result.current).toEqual([]);
  });

  it('combines weakness mapping, weekly exposure, and contributing exercises', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: {
          variants: [
            variantAssessmentMock({
              canonical: 'squat-pause',
              effects: ['CORE_DEMAND'],
              status: 'weakness',
            }),
          ],
          weaknesses: [],
          unassessed: [],
        },
        tagged: [
          accessory('Plank', Date.UTC(2026, 7, 3)),
          accessory('Dead Bug', Date.UTC(2026, 7, 3)),
          accessory('Plank', Date.UTC(2026, 7, 10)),
        ],
      }),
    });

    expect(renderHook(() => useWeaknessAccessoryCoverage(range)).result.current).toEqual([
      expect.objectContaining({
        effect: 'CORE_DEMAND',
        effectLabel: 'Core Demand',
        status: 'mapped',
        evidenceSummary: '1 below-range signal · 0 above-range signals',
        categories: [
          expect.objectContaining({
            category: 'core',
            label: 'Core',
            contributingExercises: ['Dead Bug', 'Plank'],
            recentExposure: [
              expect.objectContaining({ sessionCount: 1, weekLabel: 'Aug 3' }),
              expect.objectContaining({ sessionCount: 1, weekLabel: 'Aug 10' }),
            ],
          }),
        ],
      }),
    ]);
  });

  it('preserves an unsupported association with no invented category', () => {
    mockUsePipelineModel.mockReturnValue({
      status: 'success',
      model: pipelineModelMock({
        diagnostics: {
          variants: [variantAssessmentMock({ effects: ['BAR_SPEED'], status: 'weakness' })],
          weaknesses: [],
          unassessed: [],
        },
      }),
    });

    expect(renderHook(() => useWeaknessAccessoryCoverage(range)).result.current[0]).toMatchObject({
      effect: 'BAR_SPEED',
      status: 'unsupported',
      categories: [],
    });
  });
});
