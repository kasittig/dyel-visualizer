import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResolvedRawInput } from './useResolvedRawInput';
import * as sheetFetch from './sheetFetch';
import * as sheetRef from './sheetRef';

vi.mock('./sheetFetch');
vi.mock('./sheetRef');

const ref = { id: 'abc123', published: true };
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv';
const url = 'https://docs.google.com/spreadsheets/d/abc123/edit';

describe('useResolvedRawInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [
      'pasted text',
      'text' as const,
      '',
      'sample workout data',
      0,
      'pasted.txt',
      'sample workout data',
    ],
    ['pasted text refresh', 'text' as const, '', 'updated data', 1, 'pasted.txt', 'updated data'],
    [
      'sheet URL mode',
      'url' as const,
      url,
      '',
      0,
      'sheet.csv',
      'date,exercise,weight\n2024-01-01,squat,300',
    ],
  ])('success path: %s', async (_, mode, u, txt, token, filename, content) => {
    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(ref);
    vi.mocked(sheetFetch.sheetCsvUrl).mockReturnValue(csvUrl);
    vi.mocked(sheetFetch.fetchSheetCsv).mockResolvedValue(content);

    const { result } = renderHook(() => useResolvedRawInput(mode, u, txt, token));
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.raw[0]).toEqual({ name: filename, content });
  });

  it('handles idle and edge failure states', async () => {
    expect(renderHook(() => useResolvedRawInput('text', '', '', 0)).result.current.status).toBe(
      'idle'
    );

    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(null);
    expect(
      renderHook(() => useResolvedRawInput('url', 'https://bad', '', 0)).result.current.status
    ).toBe('idle');

    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(ref);
    vi.mocked(sheetFetch.fetchSheetCsv).mockRejectedValue(new Error('Network error'));
    const errHook = renderHook(() => useResolvedRawInput('url', url, '', 0));
    await waitFor(() => {
      expect(errHook.result.current.status).toBe('error');
    });

    const abort = new Error('Cancelled');
    abort.name = 'AbortError';
    vi.mocked(sheetFetch.fetchSheetCsv).mockRejectedValue(abort);
    expect(renderHook(() => useResolvedRawInput('url', url, '', 0)).result.current.status).toBe(
      'loading'
    );
  });

  it('cancels previous fetch on change and unmounts controller safely', async () => {
    vi.mocked(sheetRef.extractSheetRef).mockReturnValue(ref);
    vi.mocked(sheetFetch.sheetCsvUrl).mockReturnValue(csvUrl);

    let resolveFirst: ((v: string) => void) | null = null;
    vi.mocked(sheetFetch.fetchSheetCsv).mockReturnValueOnce(
      new Promise((r) => {
        resolveFirst = r;
      })
    );

    const { result, rerender, unmount } = renderHook(
      (p) => useResolvedRawInput(p.mode, p.url, '', p.token),
      { initialProps: { mode: 'url' as const, url, token: 0 } }
    );
    expect(result.current.status).toBe('loading');

    vi.mocked(sheetFetch.fetchSheetCsv).mockResolvedValueOnce('new,csv');
    rerender({ mode: 'url', url, token: 1 });
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.raw[0]?.content).toBe('new,csv');

    if (resolveFirst) {
      resolveFirst('old,csv');
    }
    expect(result.current.raw[0]?.content).toBe('new,csv');

    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    unmount();
    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
