import { describe, it, expect } from 'vitest';
import { buildVariationChartData, NORMALIZED_KEY } from './buildVariationChartData';
import type { ConjugateDataPair } from '../types/conjugate';
import type { RepCalcStats } from '../utils/stats/repCalculator';

const emptyStats: RepCalcStats = {
  addlWtOffset: new Map(),
  variantFactor: new Map(),
};

function pair(
  displayName: string,
  date: string,
  e1rm: number,
  opts: Partial<{
    sets: number;
    reps: number;
    weight: number;
    type: ConjugateDataPair[0]['type'];
  }> = {}
): ConjugateDataPair {
  return [
    {
      displayName,
      type: opts.type ?? 'squat',
      bar: 'standard',
      stance: 'competition',
      addlWts: [],
      equipment: null,
      averageIndex: null,
      expectedBaseline: null,
      status: null,
      diagnostic: null,
      effects: [],
    },
    {
      date: new Date(date + 'T00:00:00'),
      sets: opts.sets ?? 1,
      reps: opts.reps ?? 1,
      weight: opts.weight ?? e1rm,
      e1rm,
      unit: 'lbs',
      rpe: null,
    },
  ];
}

describe('buildVariationChartData', () => {
  it('returns empty result for empty rows', () => {
    const result = buildVariationChartData([], {}, emptyStats, null);
    expect(result.variations).toEqual([]);
    expect(result.data).toEqual([]);
    expect(result.showNormalized).toBe(false);
    expect(result.bestSetByLabelAndDate.size).toBe(0);
    expect(result.baselineExercise).toBeNull();
    expect(result.effectiveTargetName).toBeNull();
  });

  it('returns a single chart point for one exercise on one date', () => {
    const rows = [pair('Squat', '2024-01-01', 300)];
    const result = buildVariationChartData(rows, {}, emptyStats, null);
    expect(result.variations).toEqual(['Squat']);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ date: '2024-01-01', Squat: 300 });
  });

  it('keeps max e1RM when multiple sessions on the same date', () => {
    const rows = [
      pair('Squat', '2024-01-01', 280, { sets: 3, reps: 5, weight: 250 }),
      pair('Squat', '2024-01-01', 310, { sets: 1, reps: 1, weight: 310 }),
      pair('Squat', '2024-01-01', 290, { sets: 2, reps: 3, weight: 275 }),
    ];
    const result = buildVariationChartData(rows, {}, emptyStats, null);
    expect(result.data[0].Squat).toBe(310);
    expect(result.bestSetByLabelAndDate.get('Squat')?.get('2024-01-01')).toEqual({
      sets: 1,
      reps: 1,
      weight: 310,
      rpe: null,
    });
  });

  it('produces sorted dates across multiple sessions', () => {
    const rows = [
      pair('Squat', '2024-03-01', 320),
      pair('Squat', '2024-01-01', 300),
      pair('Squat', '2024-02-01', 310),
    ];
    const result = buildVariationChartData(rows, {}, emptyStats, null);
    expect(result.data.map((p) => p.date)).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
  });

  it('sorts variations alphabetically', () => {
    const rows = [pair('SSB Squat', '2024-01-01', 280), pair('Cambered Squat', '2024-01-01', 260)];
    const result = buildVariationChartData(rows, {}, emptyStats, null);
    expect(result.variations).toEqual(['Cambered Squat', 'SSB Squat']);
  });

  it('showNormalized is false when baselineNames is empty', () => {
    const rows = [pair('Squat', '2024-01-01', 300)];
    const result = buildVariationChartData(rows, {}, emptyStats, null);
    expect(result.showNormalized).toBe(false);
    expect(NORMALIZED_KEY in (result.data[0] ?? {})).toBe(false);
  });

  it('sets baselineExercise from baselineNames', () => {
    const rows = [pair('Squat', '2024-01-01', 300), pair('SSB Squat', '2024-01-01', 280)];
    const result = buildVariationChartData(rows, { squat: 'Squat' }, emptyStats, null);
    expect(result.baselineExercise?.displayName).toBe('Squat');
  });

  it('effectiveTargetName falls back to baseline when targetName not in variations', () => {
    const rows = [pair('Squat', '2024-01-01', 300)];
    const result = buildVariationChartData(rows, { squat: 'Squat' }, emptyStats, 'Unknown');
    expect(result.effectiveTargetName).toBe('Squat');
  });

  it('effectiveTargetName uses targetName when it is in variations', () => {
    const rows = [pair('Squat', '2024-01-01', 300), pair('SSB Squat', '2024-01-01', 280)];
    const result = buildVariationChartData(rows, { squat: 'Squat' }, emptyStats, 'SSB Squat');
    expect(result.effectiveTargetName).toBe('SSB Squat');
  });

  it('includes data from all variations on their respective dates', () => {
    const rows = [pair('Squat', '2024-01-01', 300), pair('SSB Squat', '2024-01-15', 280)];
    const result = buildVariationChartData(rows, {}, emptyStats, null);
    expect(result.data).toHaveLength(2);
    const jan01 = result.data.find((p) => p.date === '2024-01-01')!;
    const jan15 = result.data.find((p) => p.date === '2024-01-15')!;
    expect(jan01.Squat).toBe(300);
    expect(jan01['SSB Squat']).toBeUndefined();
    expect(jan15['SSB Squat']).toBe(280);
    expect(jan15.Squat).toBeUndefined();
  });
});
