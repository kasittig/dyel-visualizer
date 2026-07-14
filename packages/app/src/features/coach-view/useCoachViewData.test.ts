import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { LifterPipelineResult } from '@dyel/api';
import type { PipelineModel } from '@dyel/pipeline';
import { useCoachViewData } from './useCoachViewData';

vi.mock('../data-source');
vi.mock('@dyel/api', async () => ({
  ...(await vi.importActual<typeof import('@dyel/api')>('@dyel/api')),
  loadIndexPipelineModels: vi.fn(),
}));

const mockFetchSheetCsv = vi.mocked((await import('../data-source')).fetchSheetCsv);
const mockLoadIndexPipelineModels = vi.mocked((await import('@dyel/api')).loadIndexPipelineModels);

const fixtureModel = {
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
  diagnostics: { byCanonical: new Map(), allFindings: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  pointsByDeriver: new Map(),
  pointsByLabelByDeriver: new Map(),
  pointsByDeriverAdjusted: new Map(),
  pointsByLabelByDeriverAdjusted: new Map(),
  athlete: { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' },
};

describe('useCoachViewData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loading → success', async () => {
    const indexCsv = 'name,url\nAthlete 1,https://example.com/sheet1';
    const fixtureResults: LifterPipelineResult[] = [
      {
        status: 'success',
        name: 'Athlete 1',
        url: 'https://example.com/sheet1',
        model: fixtureModel as unknown as PipelineModel,
      },
    ];

    mockFetchSheetCsv.mockResolvedValue(indexCsv);
    mockLoadIndexPipelineModels.mockResolvedValue(fixtureResults);

    const { result } = renderHook(() => useCoachViewData());
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current).toEqual({ status: 'success', data: fixtureResults });
  });

  it('loading → error', async () => {
    mockFetchSheetCsv.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useCoachViewData());
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current).toEqual({ status: 'error', message: 'Network error' });
  });
});
