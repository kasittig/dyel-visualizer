import { describe, it, expect } from 'vitest';
import { applyFilters, emptyFilters } from './exerciseFilters';
import type { ConjugateDataPair } from '../types/conjugate';

function pair(type: 'squat' | 'bench' | 'deadlift' | 'accessory', sets: number): ConjugateDataPair {
  return [
    {
      type,
      bar: 'standard',
      stance: 'competition',
      addlWts: [],
      equipment: null,
      displayName: type,
      movementCategory: ['anchor'],
      averageIndex: null,
      expectedBaseline: null,
      status: null,
      diagnostic: null,
      effects: [],
    },
    { date: new Date('2024-01-01T00:00:00'), sets, reps: 5, weight: 100, e1rm: 120, unit: 'lbs' },
  ];
}

describe('applyFilters — excludeVolumeWork', () => {
  it('does nothing when false', () => {
    const rows: ConjugateDataPair[] = [
      pair('squat', 3),
      pair('bench', 5),
      pair('deadlift', 1),
      pair('accessory', 4),
    ];
    expect(applyFilters(rows, emptyFilters(), false)).toHaveLength(4);
  });

  it('removes compound sets > 1 when true', () => {
    const rows: ConjugateDataPair[] = [
      pair('squat', 3),
      pair('bench', 5),
      pair('deadlift', 1),
      pair('accessory', 4),
    ];
    const result = applyFilters(rows, emptyFilters(), true);
    expect(result).toHaveLength(2);
    expect(result[0][0].type).toBe('deadlift');
    expect(result[1][0].type).toBe('accessory');
  });

  it('keeps compound sets === 1', () => {
    const rows: ConjugateDataPair[] = [pair('squat', 1), pair('bench', 1)];
    expect(applyFilters(rows, emptyFilters(), true)).toHaveLength(2);
  });

  it('never filters accessories regardless of sets', () => {
    const rows: ConjugateDataPair[] = [pair('accessory', 10)];
    expect(applyFilters(rows, emptyFilters(), true)).toHaveLength(1);
  });
});
