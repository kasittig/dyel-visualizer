import { describe, it, expect } from 'vitest';
import { buildChartData } from './buildChartData';
import type { ConjugateDataPair, ConjugateExercise } from '../../types/conjugate';
import type { RepCalcStats } from './repCalculator';

const emptyStats: RepCalcStats = {
  addlWtOffset: new Map(),
  variantFactor: new Map(),
};

function ex(
  displayName: string,
  type: ConjugateExercise['type'],
  opts: Partial<Pick<ConjugateExercise, 'bar' | 'stance' | 'equipment' | 'addlWts'>> = {}
): ConjugateExercise {
  return {
    displayName,
    type,
    bar: opts.bar ?? 'standard',
    stance: opts.stance ?? 'competition',
    equipment: opts.equipment ?? null,
    addlWts: opts.addlWts ?? [],
    movementCategory: ['anchor'],
  };
}

function pair(
  exercise: ConjugateExercise,
  date: string,
  e1rm: number,
  opts: Partial<{ sets: number; reps: number; weight: number }> = {}
): ConjugateDataPair {
  return [
    exercise,
    {
      date: new Date(date + 'T00:00:00'),
      sets: opts.sets ?? 1,
      reps: opts.reps ?? 1,
      weight: opts.weight ?? e1rm,
      e1rm,
      unit: 'lbs',
    },
  ];
}

const noMaps = new Map<string, ConjugateExercise>();

describe('buildChartData', () => {
  it('returns empty array for empty input', () => {
    expect(buildChartData([], noMaps, noMaps, emptyStats)).toEqual([]);
  });

  it('uses raw session e1RM (rounded) when no target/baseline is set', () => {
    const rows = [pair(ex('Squat', 'squat'), '2024-01-01', 300.4)];
    const result = buildChartData(rows, noMaps, noMaps, emptyStats);
    expect(result).toEqual([{ date: '2024-01-01', squat: 300 }]);
  });

  it('ignores accessory pairs', () => {
    const rows = [
      pair(ex('Squat', 'squat'), '2024-01-01', 300),
      pair(ex('Curl', 'accessory'), '2024-01-01', 50),
    ];
    const result = buildChartData(rows, noMaps, noMaps, emptyStats);
    expect(result[0]).toEqual({ date: '2024-01-01', squat: 300 });
    expect('accessory' in result[0]).toBe(false);
  });

  it('keeps the max e1RM when multiple sessions share a date', () => {
    const rows = [
      pair(ex('Squat', 'squat'), '2024-01-01', 280),
      pair(ex('Squat', 'squat'), '2024-01-01', 310),
      pair(ex('Squat', 'squat'), '2024-01-01', 290),
    ];
    const result = buildChartData(rows, noMaps, noMaps, emptyStats);
    expect(result[0].squat).toBe(310);
  });

  it('produces rows sorted by date', () => {
    const rows = [
      pair(ex('Squat', 'squat'), '2024-03-01', 320),
      pair(ex('Squat', 'squat'), '2024-01-01', 300),
      pair(ex('Squat', 'squat'), '2024-02-01', 310),
    ];
    const result = buildChartData(rows, noMaps, noMaps, emptyStats);
    expect(result.map((p) => p.date)).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
  });

  it('emits total only after all three lifts have appeared, forward-filling last values', () => {
    const rows = [
      pair(ex('Squat', 'squat'), '2024-01-01', 100),
      pair(ex('Bench', 'bench'), '2024-01-02', 50),
      pair(ex('Deadlift', 'deadlift'), '2024-01-03', 25),
    ];
    const result = buildChartData(rows, noMaps, noMaps, emptyStats);

    const [d1, d2, d3] = result;
    expect(d1).toEqual({ date: '2024-01-01', squat: 100 });
    expect('total' in d1).toBe(false);
    expect(d2).toEqual({ date: '2024-01-02', bench: 50 });
    expect('total' in d2).toBe(false);
    // On d3 only deadlift has a fresh value; squat/bench are absent from the point
    // but their last-known values still feed the forward-filled total.
    expect(d3).toEqual({ date: '2024-01-03', deadlift: 25, total: 175 });
  });

  it('normalizes through a variant factor when a target exercise is supplied', () => {
    const squat = ex('Squat', 'squat');
    const ssb = ex('SSB Squat', 'squat', { bar: 'ssb' });
    const stats: RepCalcStats = {
      addlWtOffset: new Map(),
      variantFactor: new Map([
        ['SSB Squat', { factor: 0.9, sampleCount: 4, label: 'ssb', baselineName: 'Squat' }],
      ]),
    };
    const baselineExByType = new Map([['squat', squat]]);
    const targetExByType = new Map([['squat', squat]]);

    // SSB raw e1RM 270 → normalized to the straight-bar squat: 270 / 0.9 = 300.
    const rows = [pair(ssb, '2024-01-01', 270, { weight: 270, reps: 1 })];
    const result = buildChartData(rows, baselineExByType, targetExByType, stats);
    expect(result[0].squat).toBe(300);
  });

  it('skips a session whose value cannot be normalized to the target', () => {
    const squat = ex('Squat', 'squat');
    const front = ex('Front Squat', 'squat', { stance: 'front' });
    // No variant factor for Front Squat → normalizeToBaseE1RM returns null → session skipped.
    const baselineExByType = new Map([['squat', squat]]);
    const targetExByType = new Map([['squat', squat]]);

    const rows = [pair(front, '2024-01-01', 250)];
    const result = buildChartData(rows, baselineExByType, targetExByType, emptyStats);
    expect(result).toEqual([]);
  });
});
