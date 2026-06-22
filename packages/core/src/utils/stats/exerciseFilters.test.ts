import { describe, it, expect } from 'vitest';
import { applyFilters, emptyFilters } from './exerciseFilters';
import type { ConjugateDataPair } from '../../types/conjugate';

function pair(
  bar: 'standard' | 'safety_squat',
  equipment: 'pause' | null = null
): ConjugateDataPair {
  return [
    {
      type: 'squat',
      bar,
      stance: 'competition',
      addlWts: [],
      equipment,
      displayName: `${bar}-${equipment ?? 'raw'}`,
      averageIndex: null,
      expectedBaseline: null,
      status: null,
      diagnostic: null,
      effects: [],
    },
    {
      date: new Date('2024-01-01T00:00:00'),
      sets: 1,
      reps: 5,
      weight: 100,
      e1rm: 120,
      unit: 'lbs',
    },
  ];
}

describe('applyFilters — facet filters', () => {
  it('passes all rows when filters are empty', () => {
    const rows = [pair('standard'), pair('safety_squat')];
    expect(applyFilters(rows, emptyFilters())).toHaveLength(2);
  });

  it('filters by bar', () => {
    const rows = [pair('standard'), pair('safety_squat')];
    const filters = { ...emptyFilters(), bar: new Set(['standard']) };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(1);
    expect(result[0][0].bar).toBe('standard');
  });

  it('filters by equipment', () => {
    const rows = [pair('standard', null), pair('standard', 'pause')];
    const filters = { ...emptyFilters(), equipment: new Set(['pause']) };
    const result = applyFilters(rows, filters);
    expect(result).toHaveLength(1);
    expect(result[0][0].equipment).toBe('pause');
  });
});
