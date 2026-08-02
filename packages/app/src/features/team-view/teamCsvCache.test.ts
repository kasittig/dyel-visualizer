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

    await cachedFetchSheetCsv('https://example.com/sheet1', undefined, { now: 1000 });

    expect(JSON.parse(localStorage.getItem('dyel:teamCsvCache')!)).toEqual({
      'https://example.com/sheet1': { csv: 'a,b\n1,2', fetchedAt: 1000 },
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
      'https://example.com/sheet1': { csv: 'csv1', fetchedAt: expect.any(Number) },
      'https://example.com/sheet2': { csv: 'csv2', fetchedAt: expect.any(Number) },
    });
  });

  it('refetches expired entries and supports an explicit refresh bypass', async () => {
    if (typeof localStorage === 'undefined') {
      return;
    }
    mockFetchSheetCsv
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('new')
      .mockResolvedValueOnce('forced');

    await cachedFetchSheetCsv('https://example.com/sheet1', undefined, { now: 1000 });
    expect(
      await cachedFetchSheetCsv('https://example.com/sheet1', undefined, {
        now: 2000,
        maxAgeMs: 500,
      })
    ).toBe('new');
    expect(
      await cachedFetchSheetCsv('https://example.com/sheet1', undefined, {
        now: 2001,
        forceRefresh: true,
      })
    ).toBe('forced');
    expect(mockFetchSheetCsv).toHaveBeenCalledTimes(3);
  });

  it('keeps only the 50 most recently fetched URLs', async () => {
    if (typeof localStorage === 'undefined') {
      return;
    }
    mockFetchSheetCsv.mockResolvedValue('csv');
    await Promise.all(
      Array.from({ length: 51 }, (_, index) =>
        cachedFetchSheetCsv(`https://example.com/${index}`, undefined, { now: index })
      )
    );
    expect(Object.keys(JSON.parse(localStorage.getItem('dyel:teamCsvCache')!))).toHaveLength(50);
  });
});
