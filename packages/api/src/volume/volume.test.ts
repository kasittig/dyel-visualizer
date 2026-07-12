import { describe, it, expect } from 'vitest';
import { calculateVolumeCorrelationFromTagged } from './volume.ts';
import type { TaggedSetRecord } from '@dyel/pipeline';

const rec = (dateStr: string, weight: number, reps: number, sets?: number): TaggedSetRecord => ({
  date: new Date(`${dateStr}T00:00:00`).getTime(),
  exercise: 'test',
  weight,
  reps,
  canonical: 'test',
  tags: new Set(['lift:squat']),
  effects: [],
  baselineRange: null,
  sets,
});

describe('calculateVolumeCorrelationFromTagged', () => {
  const LBS_MUL = 2.20462262185;

  it('handles empty or basic unit tracking setups', () => {
    expect(calculateVolumeCorrelationFromTagged([], 'kg')).toEqual(new Map());
    expect(
      calculateVolumeCorrelationFromTagged([rec('2024-03-15', 100, 5, 3)], 'kg').get('2024-03-15')
    ).toBe(1500);
    expect(
      calculateVolumeCorrelationFromTagged([rec('2024-03-15', 100, 5)], 'kg').get('2024-03-15')
    ).toBe(500);
  });

  it.each([
    ['converts single row to lbs', [rec('2024-03-15', 100, 5, 3)], 1500 * LBS_MUL],
    [
      'converts and aggregates sums to lbs',
      [rec('2024-03-15', 100, 5, 3), rec('2024-03-15', 100, 5, 2)],
      2500 * LBS_MUL,
    ],
  ])('%s', (_, inputs, expected) => {
    const res = calculateVolumeCorrelationFromTagged(inputs, 'lbs').get('2024-03-15') ?? 0;
    expect(Math.abs(res - expected)).toBeLessThan(0.01);
  });

  it('aggregates multiple records and keys across days separately', () => {
    const res = calculateVolumeCorrelationFromTagged(
      [rec('2024-03-15', 100, 5, 3), rec('2024-03-15', 80, 3, 2), rec('2024-03-16', 80, 3, 2)],
      'kg'
    );
    expect(res.get('2024-03-15')).toBe(1980);
    expect(res.get('2024-03-16')).toBe(480);
    expect(res.size).toBe(2);
  });
});
