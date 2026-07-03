import { describe, it, expect } from 'vitest';
import { serializeSheetCache, deserializeSheetCache } from './sheetCacheUtils';
import type { CachedSheetData } from './sheetCacheUtils';
import type { ConjugateDataPair, LiftType } from '@dyel/core';

function pair(type: LiftType, date: Date, rpe: number | null = 8): ConjugateDataPair {
  return [
    {
      type,
      bar: 'standard',
      stance: 'competition',
      addlWts: [],
      equipment: null,
      displayName: type,
      averageIndex: null,
      expectedBaseline: null,
      status: null,
      diagnostic: null,
      effects: [],
    },
    {
      date,
      sets: 3,
      reps: 5,
      weight: 225,
      e1rm: 260,
      unit: 'lbs',
      rpe,
    },
  ];
}

function sampleData(): CachedSheetData {
  return {
    sheetKey: 'https://example.com/sheet',
    pairs: [
      pair('squat', new Date('2024-03-01T12:00:00Z')),
      pair('bench', new Date('2024-03-02T12:00:00Z'), null),
    ],
  };
}

describe('serializeSheetCache', () => {
  it('encodes dates as ISO strings', () => {
    const raw = serializeSheetCache(sampleData());
    const parsed = JSON.parse(raw);
    expect(typeof parsed.pairs[0][1].date).toBe('string');
    expect(parsed.pairs[0][1].date).toBe('2024-03-01T12:00:00.000Z');
  });
});

describe('deserializeSheetCache', () => {
  it('round-trips dates back into Date instances', () => {
    const original = sampleData();
    const result = deserializeSheetCache(serializeSheetCache(original));
    expect(result.pairs[0][1].date).toBeInstanceOf(Date);
    expect(result.pairs[0][1].date.getTime()).toBe(original.pairs[0][1].date.getTime());
    expect(result.pairs[1][1].date.getTime()).toBe(original.pairs[1][1].date.getTime());
  });

  it('preserves all other fields untouched', () => {
    const original = sampleData();
    const result = deserializeSheetCache(serializeSheetCache(original));
    expect(result.sheetKey).toBe(original.sheetKey);
    expect(result.pairs[0][0]).toEqual(original.pairs[0][0]);
    expect(result.pairs[0][1]).toEqual({ ...original.pairs[0][1] });
    expect(result.pairs[1][1].rpe).toBeNull();
  });

  it('throws on malformed JSON', () => {
    expect(() => deserializeSheetCache('not json')).toThrow();
  });

  it('throws when sheetKey is missing', () => {
    expect(() => deserializeSheetCache(JSON.stringify({ pairs: [] }))).toThrow();
  });

  it('throws when pairs is not an array', () => {
    expect(() => deserializeSheetCache(JSON.stringify({ sheetKey: 'x', pairs: {} }))).toThrow();
  });
});
