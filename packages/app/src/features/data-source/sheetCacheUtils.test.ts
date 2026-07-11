import { describe, it, expect } from 'vitest';
import { serializeSheetCache, deserializeSheetCache } from './sheetCacheUtils';
import type { CachedSheetData } from './sheetCacheUtils';
import type { RawInput } from '@dyel/api';

function rawInput(name: string, content: string): RawInput {
  return { name, content };
}

function sampleData(): CachedSheetData {
  return {
    sheetKey: 'https://example.com/sheet',
    raw: [
      rawInput('sheet.csv', 'exercise,sets,reps,weight\nsquat,3,5,225'),
      rawInput('pasted.txt', 'bench 3x5 185'),
    ],
  };
}

describe('serializeSheetCache', () => {
  it('encodes raw input as JSON', () => {
    const data = sampleData();
    const serialized = serializeSheetCache(data);
    const parsed = JSON.parse(serialized);
    expect(parsed.raw).toEqual(data.raw);
  });
});

describe('deserializeSheetCache', () => {
  it('round-trips RawInput content strings', () => {
    const original = sampleData();
    const result = deserializeSheetCache(serializeSheetCache(original));
    expect(result.raw[0].content).toBe(original.raw[0].content);
    expect(result.raw[1].content).toBe(original.raw[1].content);
  });

  it('preserves all fields untouched', () => {
    const original = sampleData();
    const result = deserializeSheetCache(serializeSheetCache(original));
    expect(result.sheetKey).toBe(original.sheetKey);
    expect(result.raw).toEqual(original.raw);
  });

  it('throws on malformed JSON', () => {
    expect(() => deserializeSheetCache('not json')).toThrow();
  });

  it('throws when sheetKey is missing', () => {
    expect(() => deserializeSheetCache(JSON.stringify({ raw: [] }))).toThrow();
  });

  it('throws when raw is not an array', () => {
    expect(() => deserializeSheetCache(JSON.stringify({ sheetKey: 'x', raw: {} }))).toThrow();
  });
});
