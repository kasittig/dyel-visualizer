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
mockRes.mockReturnValue({ status: 'idle', raw: [] });

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

  it('builds a model from raw input on success', () => {
    mockRes.mockReturnValue({ status: 'success', raw: testRawInput });
    const { result } = run();
    expect(result.current.status).toBe('success');
    expect(result.current.model).toBeTruthy();
  });

  it('passes through loading and error states', () => {
    mockRes.mockReturnValue({ status: 'loading', raw: [] });
    expect(run().result.current.status).toBe('loading');
    mockRes.mockReturnValue({ status: 'error', raw: [] });
    expect(run().result.current.status).toBe('error');
  });

  it('shows cached model while loading (stale-while-revalidate)', () => {
    if (typeof localStorage === 'undefined') {
      // Skip this test if localStorage is not available in the test environment
      return;
    }

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
    });
    localStorage.setItem('dyel:sheetDataCache', cacheData);

    // Mock useResolvedRawInput to return loading status with empty data (refetch in flight)
    mockRes.mockReturnValue({ status: 'loading', raw: [] });

    const { result } = run();

    // While loading with cached data available, should show success status and cached model (stale-while-revalidate)
    expect(result.current.status).toBe('success');
    expect(result.current.model).toBeTruthy();
  });
});
