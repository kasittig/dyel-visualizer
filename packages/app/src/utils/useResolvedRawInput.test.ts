import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResolvedRawInput } from './useResolvedRawInput';
import * as sheetFetch from './sheetFetch';
import * as sheetRef from './sheetRef';

vi.mock('./sheetFetch');
vi.mock('./sheetRef');

describe('useResolvedRawInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['pasted text', 'text' as const, '', 'sample workout data', 0],
    ['pasted text with refresh', 'text' as const, '', 'updated data', 1],
  ])('success path: %s', async (label, inputMode, url, pastedText, refreshToken) => {
    const { result } = renderHook(() =>
      useResolvedRawInput(inputMode, url, pastedText, refreshToken)
    );

    // Text mode resolves synchronously
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.raw).toHaveLength(1);
    expect(result.current.raw[0]).toEqual({
      name: 'pasted.txt',
      content: pastedText,
    });
  });

  it('success path: sheet URL mode', async () => {
    const mockSheetRef = { id: 'abc123', published: true };
    const mockCsvUrl = 'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv';
    const mockCsv = 'date,exercise,weight\n2024-01-01,squat,300';

    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(mockSheetRef);
    vi.mocked(sheetFetch.sheetCsvUrl).mockReturnValue(mockCsvUrl);
    vi.mocked(sheetFetch.fetchSheetCsv).mockResolvedValue(mockCsv);

    const { result } = renderHook(() =>
      useResolvedRawInput('url', 'https://docs.google.com/spreadsheets/d/abc123/edit', '', 0)
    );

    expect(result.current.status).toBe('loading');
    expect(result.current.raw).toEqual([]);

    // After fetch completes
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.raw).toHaveLength(1);
    expect(result.current.raw[0]).toEqual({
      name: 'sheet.csv',
      content: mockCsv,
    });

    // Verify the fetch was called with the correct URL and an AbortSignal
    expect(sheetFetch.fetchSheetCsv).toHaveBeenCalledWith(mockCsvUrl, expect.any(AbortSignal));
  });

  it('idle state: empty text input', async () => {
    const { result } = renderHook(() => useResolvedRawInput('text', '', '', 0));

    // Empty text should keep hook in idle state
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
    expect(result.current.raw).toEqual([]);
  });

  it('idle state: no valid sheet ref', async () => {
    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(null);

    const { result } = renderHook(() =>
      useResolvedRawInput('url', 'https://not-a-real-sheet-url', '', 0)
    );

    // Invalid URL should keep hook in idle state
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
    expect(result.current.raw).toEqual([]);

    // extractSheetRef should have been called
    expect(sheetRef.extractSheetRef).toHaveBeenCalledWith('https://not-a-real-sheet-url');
  });

  it('error state: fetch failure', async () => {
    const mockSheetRef = { id: 'abc123', published: true };
    const mockCsvUrl = 'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv';

    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(mockSheetRef);
    vi.mocked(sheetFetch.sheetCsvUrl).mockReturnValue(mockCsvUrl);
    vi.mocked(sheetFetch.fetchSheetCsv).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useResolvedRawInput('url', 'https://docs.google.com/spreadsheets/d/abc123/edit', '', 0)
    );

    expect(result.current.status).toBe('loading');

    // After fetch fails
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.raw).toEqual([]);
  });

  it('ignores AbortError on cancellation', async () => {
    const mockSheetRef = { id: 'abc123', published: true };
    const mockCsvUrl = 'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv';

    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(mockSheetRef);
    vi.mocked(sheetFetch.sheetCsvUrl).mockReturnValue(mockCsvUrl);

    const abortError = new Error('Cancelled');
    abortError.name = 'AbortError';
    vi.mocked(sheetFetch.fetchSheetCsv).mockRejectedValue(abortError);

    const { result } = renderHook(() =>
      useResolvedRawInput('url', 'https://docs.google.com/spreadsheets/d/abc123/edit', '', 0)
    );

    expect(result.current.status).toBe('loading');

    // After abort error, status should stay loading (no transition to error)
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.status).toBe('loading');
  });

  it('cancels previous fetch on dependency change', async () => {
    const mockSheetRef = { id: 'abc123', published: true };
    const mockCsvUrl = 'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv';

    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(mockSheetRef);
    vi.mocked(sheetFetch.sheetCsvUrl).mockReturnValue(mockCsvUrl);

    // First fetch hangs
    let resolveFirstFetch: ((value: string) => void) | null = null;
    const firstFetchPromise = new Promise<string>((resolve) => {
      resolveFirstFetch = resolve;
    });
    vi.mocked(sheetFetch.fetchSheetCsv).mockReturnValueOnce(firstFetchPromise);

    const { result, rerender } = renderHook(
      ({ inputMode, url, pastedText, refreshToken }) =>
        useResolvedRawInput(inputMode, url, pastedText, refreshToken),
      {
        initialProps: {
          inputMode: 'url' as const,
          url: 'https://docs.google.com/spreadsheets/d/abc123/edit',
          pastedText: '',
          refreshToken: 0,
        },
      }
    );

    expect(result.current.status).toBe('loading');

    // Update refreshToken, which should abort previous fetch and start a new one
    vi.mocked(sheetFetch.fetchSheetCsv).mockResolvedValueOnce('new,csv,data');
    rerender({
      inputMode: 'url' as const,
      url: 'https://docs.google.com/spreadsheets/d/abc123/edit',
      pastedText: '',
      refreshToken: 1,
    });

    // The second fetch should start loading
    expect(result.current.status).toBe('loading');

    // Eventually resolves with new data
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.raw[0]?.content).toBe('new,csv,data');

    // Resolve the first (now-aborted) fetch - should be ignored
    resolveFirstFetch?.('old,csv,data');

    // Verify we still have the new data, not the old
    expect(result.current.raw[0]?.content).toBe('new,csv,data');
  });

  it('cleans up AbortController on unmount', async () => {
    const mockSheetRef = { id: 'abc123', published: true };
    const mockCsvUrl = 'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv';

    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(mockSheetRef);
    vi.mocked(sheetFetch.sheetCsvUrl).mockReturnValue(mockCsvUrl);

    // Fetch that never resolves
    vi.mocked(sheetFetch.fetchSheetCsv).mockImplementation(() => new Promise(() => {}));

    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

    const { unmount } = renderHook(() =>
      useResolvedRawInput('url', 'https://docs.google.com/spreadsheets/d/abc123/edit', '', 0)
    );

    // Cleanup should call abort when component unmounts
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
