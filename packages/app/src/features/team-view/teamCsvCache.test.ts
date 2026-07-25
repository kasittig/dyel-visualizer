import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cachedFetchSheetCsv } from './teamCsvCache';

vi.mock('../data-source', () => ({ fetchSheetCsv: vi.fn() }));

const mockFetchSheetCsv = vi.mocked((await import('../data-source')).fetchSheetCsv);

describe('cachedFetchSheetCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });
  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('fetches over the network on a cache miss and returns the result', async () => {
    mockFetchSheetCsv.mockResolvedValue('a,b\n1,2');

    const csv = await cachedFetchSheetCsv('https://example.com/sheet1');

    expect(csv).toBe('a,b\n1,2');
    expect(mockFetchSheetCsv).toHaveBeenCalledTimes(1);
  });

  it('caches the result in localStorage on a cache miss', async () => {
    if (typeof localStorage === 'undefined') {
      // Skip this test if localStorage is not available in the test environment
      return;
    }
    mockFetchSheetCsv.mockResolvedValue('a,b\n1,2');

    await cachedFetchSheetCsv('https://example.com/sheet1');

    expect(JSON.parse(localStorage.getItem('dyel:teamCsvCache')!)).toEqual({
      'https://example.com/sheet1': 'a,b\n1,2',
    });
  });

  it('reuses the cached value on a hit without calling fetchSheetCsv again', async () => {
    if (typeof localStorage === 'undefined') {
      // Skip this test if localStorage is not available in the test environment
      return;
    }
    mockFetchSheetCsv.mockResolvedValue('a,b\n1,2');
    await cachedFetchSheetCsv('https://example.com/sheet1');
    mockFetchSheetCsv.mockClear();

    const csv = await cachedFetchSheetCsv('https://example.com/sheet1');

    expect(csv).toBe('a,b\n1,2');
    expect(mockFetchSheetCsv).not.toHaveBeenCalled();
  });

  it('caches distinct URLs independently', async () => {
    if (typeof localStorage === 'undefined') {
      // Skip this test if localStorage is not available in the test environment
      return;
    }
    mockFetchSheetCsv.mockResolvedValueOnce('csv1').mockResolvedValueOnce('csv2');

    await cachedFetchSheetCsv('https://example.com/sheet1');
    await cachedFetchSheetCsv('https://example.com/sheet2');

    expect(mockFetchSheetCsv).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem('dyel:teamCsvCache')!)).toEqual({
      'https://example.com/sheet1': 'csv1',
      'https://example.com/sheet2': 'csv2',
    });
  });
});
