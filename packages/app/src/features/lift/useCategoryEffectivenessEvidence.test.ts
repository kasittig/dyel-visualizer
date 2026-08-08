import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pipelineModelMock } from '../../test/helpers/pipelineModelFactory';
import { useCategoryEffectivenessEvidence } from './useCategoryEffectivenessEvidence';

vi.mock('../../app/PipelineContext');
vi.mock('@dyel/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dyel/api')>()),
  associateCategoryExposureWithLaterWeakness: vi.fn(),
  buildWeeklyAccessoryCategoryExposure: vi.fn(),
  deriveHistoricalWeaknessTrends: vi.fn(),
}));
const mockUsePipelineModel = vi.mocked(
  (await import('../../app/PipelineContext')).usePipelineModel
);
const api = await import('@dyel/api');
const mockAssociate = vi.mocked(api.associateCategoryExposureWithLaterWeakness);
const mockExposure = vi.mocked(api.buildWeeklyAccessoryCategoryExposure);
const mockTrends = vi.mocked(api.deriveHistoricalWeaknessTrends);

describe('useCategoryEffectivenessEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePipelineModel.mockReturnValue({ status: 'success', model: pipelineModelMock() });
    mockExposure.mockReturnValue([]);
    mockTrends.mockReturnValue([]);
    mockAssociate.mockReturnValue([]);
  });

  it('passes an explicit earlier/later split of the selected range to the API', () => {
    renderHook(() =>
      useCategoryEffectivenessEvidence({
        from: new Date(2026, 7, 1),
        to: new Date(2026, 7, 31),
      })
    );
    expect(mockAssociate).toHaveBeenCalledWith([], [], {
      exposure: { start: Date.UTC(2026, 7, 1), end: Date.UTC(2026, 7, 16) },
      outcome: { start: Date.UTC(2026, 7, 16), end: Date.UTC(2026, 8, 1) },
    });
  });

  it.each([
    ['missing end', { from: new Date(2026, 7, 1) }, 'complete selected date range'],
    [
      'one day',
      { from: new Date(2026, 7, 1), to: new Date(2026, 7, 1) },
      'at least two calendar days',
    ],
  ])('keeps %s insufficiency visible', (_, range, reason) => {
    expect(renderHook(() => useCategoryEffectivenessEvidence(range)).result.current).toMatchObject({
      rows: [],
      unavailableReason: expect.stringContaining(reason),
    });
    expect(mockAssociate).not.toHaveBeenCalled();
  });

  it('formats category-level association evidence for rendering', () => {
    mockAssociate.mockReturnValue([
      {
        category: 'core',
        quality: 'CORE_DEMAND',
        exposurePeriod: { start: Date.UTC(2026, 7, 1), end: Date.UTC(2026, 7, 16) },
        outcomePeriod: { start: Date.UTC(2026, 7, 16), end: Date.UTC(2026, 8, 1) },
        sessionCount: 4,
        exposureWeekCount: 2,
        baselineNormalizedResult: 0.8,
        outcomeNormalizedResult: 0.9,
        weaknessChange: 0.1,
        baselineEvidenceCount: 2,
        outcomeEvidenceCount: 4,
        evidenceCount: 6,
        observationCount: 2,
        status: 'possible-improvement',
        interpretation: 'Category exposure was followed by possible improvement.',
      },
    ]);
    expect(
      renderHook(() =>
        useCategoryEffectivenessEvidence({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 31) })
      ).result.current.rows[0]
    ).toMatchObject({
      category: 'core',
      categoryLabel: 'Core',
      qualityLabel: 'Core Demand',
      statusLabel: 'Possible improvement',
      sessionSummary: '4 sessions across 2 weeks · 2.0 per week',
      changeDisplay: '+10.0 percentage points',
      evidenceSummary: expect.stringContaining('6 contributing lift signals'),
      requirementDisplay: null,
    });
  });

  it('explains the exact missing requirements for insufficient evidence', () => {
    mockAssociate.mockReturnValue([
      {
        category: 'core',
        quality: 'CORE_DEMAND',
        exposurePeriod: { start: Date.UTC(2026, 7, 1), end: Date.UTC(2026, 7, 16) },
        outcomePeriod: { start: Date.UTC(2026, 7, 16), end: Date.UTC(2026, 8, 1) },
        sessionCount: 0,
        exposureWeekCount: 0,
        baselineNormalizedResult: null,
        outcomeNormalizedResult: 0.9,
        weaknessChange: null,
        baselineEvidenceCount: 0,
        outcomeEvidenceCount: 4,
        evidenceCount: 4,
        observationCount: 2,
        status: 'insufficient-data',
        interpretation: 'Insufficient data to assess an association.',
      },
    ]);

    expect(
      renderHook(() =>
        useCategoryEffectivenessEvidence({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 31) })
      ).result.current.rows[0]?.requirementDisplay
    ).toBe(
      'Needed: 1 category session in the earlier period and 1 usable lift observation in the earlier period.'
    );
  });
});
