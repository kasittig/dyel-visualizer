import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { SheetValidationResult } from '@dyel/api';
import { useSheetValidation } from './useSheetValidation';
import * as dataSource from '../data-source';
import * as api from '@dyel/api';

vi.mock('../data-source');
vi.mock('@dyel/api');

const ref = { id: 'abc123', published: true };
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv';
const sheetUrl = 'https://docs.google.com/spreadsheets/d/abc123/edit';

const validationResult = (overrides?: Partial<SheetValidationResult>): SheetValidationResult => ({
  verdict: 'ok',
  headerRow: 0,
  columns: { date: true, exercise: true, weight: true },
  rows: { total: 10, parsed: 10, liftTypes: { squat: 5, bench: 3, deadlift: 2, accessory: 0 } },
  issues: [],
  warnings: [],
  ...overrides,
});

describe('useSheetValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['valid published sheet', sheetUrl, ref, csvUrl, 'date,exercise,weight\n2024-01-01,squat,300'],
    [
      'sheet with warnings',
      sheetUrl,
      ref,
      csvUrl,
      'date,exercise,weight\n2024-01-01,squat,300',
      { verdict: 'warning' as const, warnings: ['some issue'] },
    ],
  ])('transitions idle → loading → success: %s', async (_, url, sheetRef, url2, csv, overrides) => {
    vi.mocked(dataSource.extractSheetRef).mockReturnValue(sheetRef);
    vi.mocked(dataSource.sheetCsvUrl).mockReturnValue(url2);
    vi.mocked(dataSource.fetchSheetCsv).mockResolvedValue(csv);
    vi.mocked(api.validateSheetCsv).mockReturnValue(validationResult(overrides));

    const { result } = renderHook(() => useSheetValidation());
    expect(result.current[0].status).toBe('idle');

    act(() => {
      result.current[1](url);
    });
    expect(result.current[0].status).toBe('loading');

    await waitFor(() => {
      expect(result.current[0].status).toBe('success');
    });
    expect(result.current[0].status).toBe('success');
    if (result.current[0].status === 'success') {
      expect(result.current[0].result).toEqual(validationResult(overrides));
      expect(result.current[0].sheetUrl).toBe(url);
    }
  });

  it('handles network error from fetchSheetCsv', async () => {
    vi.mocked(dataSource.extractSheetRef).mockReturnValue(ref);
    vi.mocked(dataSource.sheetCsvUrl).mockReturnValue(csvUrl);
    vi.mocked(dataSource.fetchSheetCsv).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSheetValidation());
    expect(result.current[0].status).toBe('idle');

    act(() => {
      result.current[1](sheetUrl);
    });
    expect(result.current[0].status).toBe('loading');

    await waitFor(() => {
      expect(result.current[0].status).toBe('error');
    });
    expect(result.current[0].status).toBe('error');
    if (result.current[0].status === 'error') {
      expect(result.current[0].message).toBe('Network error');
    }
  });

  it('rejects invalid sheet URL', () => {
    vi.mocked(dataSource.extractSheetRef).mockReturnValue(null);

    const { result } = renderHook(() => useSheetValidation());
    expect(result.current[0].status).toBe('idle');

    act(() => {
      result.current[1]('not a sheet url');
    });
    expect(result.current[0].status).toBe('error');
    if (result.current[0].status === 'error') {
      expect(result.current[0].message).toContain("doesn't look like a Google Sheet URL");
    }
  });

  it('cancels previous fetch when second validation starts before first resolves', async () => {
    vi.mocked(dataSource.extractSheetRef).mockReturnValue(ref);
    vi.mocked(dataSource.sheetCsvUrl).mockReturnValue(csvUrl);

    let resolveFirst: ((v: string) => void) | null = null;
    vi.mocked(dataSource.fetchSheetCsv).mockReturnValueOnce(
      new Promise((r) => {
        resolveFirst = r;
      })
    );
    vi.mocked(api.validateSheetCsv).mockReturnValue(validationResult({ verdict: 'error' }));

    const { result } = renderHook(() => useSheetValidation());

    act(() => {
      result.current[1](sheetUrl);
    });
    expect(result.current[0].status).toBe('loading');

    vi.mocked(dataSource.fetchSheetCsv).mockResolvedValueOnce('new,csv');
    vi.mocked(api.validateSheetCsv).mockReturnValue(validationResult({ verdict: 'ok' }));
    act(() => {
      result.current[1](sheetUrl);
    });

    await waitFor(() => {
      expect(result.current[0].status).toBe('success');
    });
    expect(result.current[0].status).toBe('success');
    if (result.current[0].status === 'success') {
      expect(result.current[0].result.verdict).toBe('ok');
    }

    if (resolveFirst) {
      resolveFirst('old,csv');
    }

    expect(result.current[0].status).toBe('success');
    if (result.current[0].status === 'success') {
      expect(result.current[0].result.verdict).toBe('ok');
    }
  });

  it('suppresses AbortError when in-flight request is cancelled', async () => {
    vi.mocked(dataSource.extractSheetRef).mockReturnValue(ref);
    vi.mocked(dataSource.sheetCsvUrl).mockReturnValue(csvUrl);

    let rejectFirst: ((err: Error) => void) | null = null;
    vi.mocked(dataSource.fetchSheetCsv).mockReturnValueOnce(
      new Promise((_, rej) => {
        rejectFirst = rej;
      })
    );

    const { result } = renderHook(() => useSheetValidation());

    act(() => {
      result.current[1](sheetUrl);
    });
    expect(result.current[0].status).toBe('loading');

    vi.mocked(dataSource.fetchSheetCsv).mockResolvedValueOnce('new,csv');
    vi.mocked(api.validateSheetCsv).mockReturnValue(validationResult());
    act(() => {
      result.current[1](sheetUrl);
    });

    await waitFor(() => {
      expect(result.current[0].status).toBe('success');
    });

    if (rejectFirst) {
      const abort = new Error('Cancelled');
      abort.name = 'AbortError';
      rejectFirst(abort);
    }

    await waitFor(() => {
      expect(result.current[0].status).toBe('success');
    });
    expect(result.current[0].status).toBe('success');
    if (result.current[0].status === 'success') {
      expect(result.current[0].result.verdict).toBe('ok');
    }
  });
});
