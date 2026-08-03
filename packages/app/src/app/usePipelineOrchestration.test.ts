import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RawInput, AthleteContext } from '@dyel/api';
import { usePipelineOrchestration } from './usePipelineOrchestration';
import { serializeSheetCache } from '../features/data-source/sheetCacheUtils';
import * as useResolvedRawInput from '../features/data-source/useResolvedRawInput';

vi.mock('../features/data-source/useResolvedRawInput');
const mockRes = vi.mocked(useResolvedRawInput.useResolvedRawInput);
const athleteBase: Pick<AthleteContext, 'sex' | 'bodyweight'> = { sex: 'M', bodyweight: 80 };

// Default mock
mockRes.mockReturnValue({ status: 'idle', raw: [], lastUpdatedAt: null });

const testRawInput: RawInput[] = [
  {
    name: 't.csv',
    content: 'date,exercise,weight,reps\n2024-01-01,squat,400,1\n2024-01-02,bench press,300,1',
  },
];

const run = () =>
  renderHook(() => usePipelineOrchestration('url', 'https://example.com', '', 0, athleteBase));

describe('usePipelineOrchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage === 'undefined') {
      const values = new Map<string, string>();
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      });
    }
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.unstubAllGlobals();
  });

  it('builds a model from raw input on success', () => {
    mockRes.mockReturnValue({ status: 'success', raw: testRawInput, lastUpdatedAt: new Date() });
    const { result } = run();
    expect(result.current.status).toBe('success');
    expect(result.current.model).toBeTruthy();
  });

  it('passes through loading and error states', () => {
    mockRes.mockReturnValue({ status: 'loading', raw: [], lastUpdatedAt: null });
    expect(run().result.current.status).toBe('loading');
    mockRes.mockReturnValue({ status: 'error', raw: [], lastUpdatedAt: null });
    expect(run().result.current.status).toBe('error');
  });

  it('shows cached model while loading (stale-while-revalidate)', () => {
    const cachedRaw: RawInput[] = [
      {
        name: 'cached.csv',
        content: 'date,exercise,weight,reps\n2024-01-01,squat,300,5',
      },
    ];

    // Pre-populate localStorage with cached data (simulates previous successful load)
    const cacheData = serializeSheetCache({
      sheetKey: 'https://example.com',
      raw: cachedRaw,
      updatedAt: '2026-08-02T14:30:00.000Z',
    });
    localStorage.setItem('dyel:sheetDataCache', cacheData);

    // Mock useResolvedRawInput to return loading status with empty data (refetch in flight)
    mockRes.mockReturnValue({ status: 'loading', raw: [], lastUpdatedAt: null });

    const { result } = run();

    // While loading with cached data available, should show success status and cached model (stale-while-revalidate)
    expect(result.current.status).toBe('success');
    expect(result.current.model).toBeTruthy();
    expect(result.current.requestStatus).toBe('loading');
    expect(result.current.isUsingCachedData).toBe(true);
    expect(result.current.lastUpdatedAt?.toISOString()).toBe('2026-08-02T14:30:00.000Z');
  });

  it('keeps the current model visible while its source refreshes', () => {
    mockRes.mockReturnValue({
      status: 'loading',
      raw: testRawInput,
      lastUpdatedAt: new Date('2026-08-02T15:00:00.000Z'),
    });

    const { result } = run();

    expect(result.current.status).toBe('success');
    expect(result.current.requestStatus).toBe('loading');
    expect(result.current.model).toBeTruthy();
    expect(result.current.isUsingCachedData).toBe(true);
  });

  it('keeps the cached model visible when a refresh fails', () => {
    localStorage.setItem(
      'dyel:sheetDataCache',
      serializeSheetCache({ sheetKey: 'https://example.com', raw: testRawInput })
    );
    mockRes.mockReturnValue({ status: 'error', raw: [], lastUpdatedAt: null });

    const { result } = run();

    expect(result.current.status).toBe('success');
    expect(result.current.requestStatus).toBe('error');
    expect(result.current.model).toBeTruthy();
  });
});
