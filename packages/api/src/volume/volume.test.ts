import { describe, it, expect } from 'vitest';
import { calculateVolumeCorrelationFromTagged } from './volume.ts';
import type { TaggedSetRecord } from '@dyel/pipeline';

describe('calculateVolumeCorrelationFromTagged', () => {
  const taggedRec = (
    dateStr: string,
    weight: number,
    reps: number,
    sets?: number
  ): TaggedSetRecord => {
    const dateObj = new Date(dateStr + 'T00:00:00');
    return {
      date: dateObj.getTime(),
      exercise: 'test',
      weight,
      reps,
      canonical: 'test',
      tags: new Set(['lift:squat']),
      effects: [],
      baselineRange: null,
      sets,
    };
  };

  it('returns an empty map for no records', () => {
    expect(calculateVolumeCorrelationFromTagged([], 'kg')).toEqual(new Map());
  });

  it('computes sets × reps × weight tonnage for a single record (kg)', () => {
    // 100 kg × 5 reps × 3 sets = 1500 kg·reps·sets
    const result = calculateVolumeCorrelationFromTagged([taggedRec('2024-03-15', 100, 5, 3)], 'kg');
    expect(result.get('2024-03-15')).toBe(1500);
  });

  it('converts tonnage to lbs when requested', () => {
    // 100 kg × 5 reps × 3 sets = 1500 kg·reps·sets
    // 1500 * 2.20462262185 = 3306.93... lbs·reps·sets
    const result = calculateVolumeCorrelationFromTagged(
      [taggedRec('2024-03-15', 100, 5, 3)],
      'lbs'
    );
    const expected = 1500 * 2.20462262185;
    expect(Math.abs((result.get('2024-03-15') ?? 0) - expected)).toBeLessThan(0.01);
  });

  it('treats undefined sets as 1', () => {
    // 100 kg × 5 reps × 1 (default) set = 500 kg·reps
    const result = calculateVolumeCorrelationFromTagged([taggedRec('2024-03-15', 100, 5)], 'kg');
    expect(result.get('2024-03-15')).toBe(500);
  });

  it('sums tonnage across multiple records on the same day', () => {
    const result = calculateVolumeCorrelationFromTagged(
      [
        taggedRec('2024-03-15', 100, 5, 3), // 1500
        taggedRec('2024-03-15', 80, 3, 2), // 480
      ],
      'kg'
    );
    expect(result.get('2024-03-15')).toBe(1500 + 480);
  });

  it('keeps separate totals for different days', () => {
    const result = calculateVolumeCorrelationFromTagged(
      [taggedRec('2024-03-15', 100, 5, 3), taggedRec('2024-03-16', 80, 3, 2)],
      'kg'
    );
    expect(result.get('2024-03-15')).toBe(1500);
    expect(result.get('2024-03-16')).toBe(480);
    expect(result.size).toBe(2);
  });

  it('keys by local calendar day in YYYY-MM-DD format', () => {
    const result = calculateVolumeCorrelationFromTagged([taggedRec('2024-01-15', 100, 1, 1)], 'kg');
    expect(result.has('2024-01-15')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('converts both unit and sums correctly', () => {
    const result = calculateVolumeCorrelationFromTagged(
      [
        taggedRec('2024-03-15', 100, 5, 3), // 1500 kg = 3306.93... lbs
        taggedRec('2024-03-15', 100, 5, 2), // 1000 kg = 2204.62... lbs
      ],
      'lbs'
    );
    const expected = (1500 + 1000) * 2.20462262185;
    expect(Math.abs((result.get('2024-03-15') ?? 0) - expected)).toBeLessThan(0.01);
  });
});
