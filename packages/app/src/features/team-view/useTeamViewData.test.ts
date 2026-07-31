import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { LifterPipelineResult } from '@dyel/api';
import type { PipelineModel } from '@dyel/pipeline';
import { useTeamViewData } from './useTeamViewData';

vi.mock('../data-source');
vi.mock('@dyel/api', async () => ({
  ...(await vi.importActual<typeof import('@dyel/api')>('@dyel/api')),
  loadIndexPipelineModels: vi.fn(),
}));

const mockFetchSheetCsv = vi.mocked((await import('../data-source')).fetchSheetCsv);
const mockExtractSheetRef = vi.mocked((await import('../data-source')).extractSheetRef);
const mockSheetCsvUrl = vi.mocked((await import('../data-source')).sheetCsvUrl);
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
  athlete: { sex: 'M', bodyweight: 90 },
};

describe('useTeamViewData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
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

    const { result } = renderHook(() => useTeamViewData());
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current).toEqual({ status: 'success', data: fixtureResults });
  });

  it('reuses cached index CSV text on a second mount instead of refetching', async () => {
    if (typeof localStorage === 'undefined') {
      // Skip this test if localStorage is not available in the test environment
      return;
    }
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

    const first = renderHook(() => useTeamViewData());
    await waitFor(() => {
      expect(first.result.current.status).toBe('success');
    });
    expect(mockFetchSheetCsv).toHaveBeenCalledTimes(1);

    mockFetchSheetCsv.mockClear();
    const second = renderHook(() => useTeamViewData());
    await waitFor(() => {
      expect(second.result.current.status).toBe('success');
    });
    expect(mockFetchSheetCsv).not.toHaveBeenCalled();
  });

  it('loading → error', async () => {
    mockFetchSheetCsv.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useTeamViewData());
    expect(result.current.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current).toEqual({ status: 'error', message: 'Network error' });
  });

  it('passes one abort signal through index and lifter sheet requests', async () => {
    mockExtractSheetRef.mockReturnValue({ id: 'sheet1', published: false });
    mockSheetCsvUrl.mockReturnValue('https://example.com/sheet1.csv');
    mockFetchSheetCsv
      .mockResolvedValueOnce('name,url\nAthlete 1,https://example.com/sheet1')
      .mockResolvedValueOnce('date,exercise,weight,reps');
    mockLoadIndexPipelineModels.mockImplementation(async (_csv, _athlete, fetchCsv) => {
      await fetchCsv('https://example.com/sheet1');
      return [];
    });

    const view = renderHook(() => useTeamViewData());
    await waitFor(() => expect(view.result.current.status).toBe('success'));

    const indexSignal = mockFetchSheetCsv.mock.calls[0][1];
    const lifterSignal = mockFetchSheetCsv.mock.calls[1][1];
    expect(indexSignal).toBeInstanceOf(AbortSignal);
    expect(lifterSignal).toBe(indexSignal);

    view.unmount();
    expect(indexSignal?.aborted).toBe(true);
  });
});
