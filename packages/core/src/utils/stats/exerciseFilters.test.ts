import { describe, it, expect } from 'vitest';
import { applyFilters, emptyFilters, filterByDateRange } from './exerciseFilters';
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

function datedPair(dateStr: string): ConjugateDataPair {
  return [
    {
      type: 'squat',
      bar: 'standard',
      stance: 'competition',
      addlWts: [],
      equipment: null,
      displayName: 'squat',
      averageIndex: null,
      expectedBaseline: null,
      status: null,
      diagnostic: null,
      effects: [],
    },
    {
      date: new Date(dateStr),
      sets: 1,
      reps: 5,
      weight: 100,
      e1rm: 120,
      unit: 'lbs',
    },
  ];
}

describe('filterByDateRange', () => {
  // Use local-time constructor to match how session dates are stored
  const jan1 = datedPair('2024-01-01T00:00:00');
  const jan15 = datedPair('2024-01-15T00:00:00');
  const feb1 = datedPair('2024-02-01T00:00:00');
  const rows = [jan1, jan15, feb1];

  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

  it('returns all rows when no bounds given', () => {
    expect(filterByDateRange(rows, undefined, undefined)).toHaveLength(3);
  });

  it('returns empty array unchanged', () => {
    expect(filterByDateRange([], d(2024, 1, 1), d(2024, 2, 1))).toHaveLength(0);
  });

  it('filters with from-only bound', () => {
    const result = filterByDateRange(rows, d(2024, 1, 15), undefined);
    expect(result).toHaveLength(2);
    expect(result[0][1].date).toEqual(jan15[1].date);
    expect(result[1][1].date).toEqual(feb1[1].date);
  });

  it('filters with to-only bound', () => {
    const result = filterByDateRange(rows, undefined, d(2024, 1, 15));
    expect(result).toHaveLength(2);
    expect(result[0][1].date).toEqual(jan1[1].date);
    expect(result[1][1].date).toEqual(jan15[1].date);
  });

  it('filters with both bounds', () => {
    const result = filterByDateRange(rows, d(2024, 1, 15), d(2024, 1, 15));
    expect(result).toHaveLength(1);
    expect(result[0][1].date).toEqual(jan15[1].date);
  });

  it('includes sessions exactly on the start boundary', () => {
    const result = filterByDateRange(rows, d(2024, 1, 1), d(2024, 1, 15));
    expect(result).toHaveLength(2);
    expect(result.some(([, s]) => s.date.getTime() === jan1[1].date.getTime())).toBe(true);
  });

  it('includes sessions exactly on the end boundary', () => {
    const result = filterByDateRange(rows, d(2024, 1, 15), d(2024, 2, 1));
    expect(result).toHaveLength(2);
    expect(result.some(([, s]) => s.date.getTime() === feb1[1].date.getTime())).toBe(true);
  });
});

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
