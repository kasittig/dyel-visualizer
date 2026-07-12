import { describe, it, expect } from 'vitest';
import { serializeSheetCache, deserializeSheetCache } from './sheetCacheUtils';
import type { CachedSheetData } from './sheetCacheUtils';

const sampleData = (): CachedSheetData => ({
  sheetKey: 'https://example.com/sheet',
  raw: [
    { name: 'sheet.csv', content: 'exercise,sets,reps,weight\nsquat,3,5,225' },
    { name: 'pasted.txt', content: 'bench 3x5 185' },
  ],
});

describe('sheetCacheUtils', () => {
  it('serializes and round-trips data perfectly', () => {
    const data = sampleData();
    const serialized = serializeSheetCache(data);
    expect(JSON.parse(serialized).raw).toEqual(data.raw);

    const roundTripped = deserializeSheetCache(serialized);
    expect(roundTripped.sheetKey).toBe(data.sheetKey);
    expect(roundTripped.raw).toEqual(data.raw);
  });

  it('enforces validation rules and json boundaries on deserialization', () => {
    expect(() => deserializeSheetCache('not json')).toThrow();
    expect(() => deserializeSheetCache(JSON.stringify({ raw: [] }))).toThrow();
    expect(() => deserializeSheetCache(JSON.stringify({ sheetKey: 'x', raw: {} }))).toThrow();
  });
});
