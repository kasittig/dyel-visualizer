import { describe, it, expect } from 'vitest';
import { calculateVolumeCorrelation } from './volume';
import type { ConjugateDataPair, ConjugateExercise, TrainingSession } from '../../types/conjugate';

const d = (dateStr: string) => new Date(dateStr + 'T00:00:00');

const exercise = (type: ConjugateExercise['type'] = 'accessory'): ConjugateExercise => ({
  type,
  bar: null,
  stance: null,
  addlWts: [],
  equipment: null,
  displayName: 'Test Exercise',
  averageIndex: null,
  expectedBaseline: null,
  status: null,
  diagnostic: null,
  effects: [],
});

const pair = (
  dateStr: string,
  sets: number,
  reps: number,
  weight: number,
  type: ConjugateExercise['type'] = 'accessory'
): ConjugateDataPair => {
  const session: TrainingSession = {
    date: d(dateStr),
    sets,
    reps,
    weight,
    e1rm: weight,
    unit: 'lbs',
    rpe: null,
  };
  return [exercise(type), session];
};

describe('calculateVolumeCorrelation', () => {
  it('returns an empty map for no sessions', () => {
    expect(calculateVolumeCorrelation([])).toEqual(new Map());
  });

  it('computes sets * reps * weight tonnage for a single session', () => {
    const result = calculateVolumeCorrelation([pair('2024-03-15', 3, 10, 100)]);
    expect(result.get('2024-03-15')).toBe(3000);
  });

  it('sums tonnage across multiple sessions on the same day', () => {
    const result = calculateVolumeCorrelation([
      pair('2024-03-15', 3, 10, 100),
      pair('2024-03-15', 2, 5, 200),
    ]);
    expect(result.get('2024-03-15')).toBe(3000 + 2000);
  });

  it('keeps separate totals for different days', () => {
    const result = calculateVolumeCorrelation([
      pair('2024-03-15', 3, 10, 100),
      pair('2024-03-16', 2, 5, 200),
    ]);
    expect(result.get('2024-03-15')).toBe(3000);
    expect(result.get('2024-03-16')).toBe(2000);
    expect(result.size).toBe(2);
  });

  it('does not filter by exercise type — every pair counts toward the total', () => {
    const result = calculateVolumeCorrelation([
      pair('2024-03-15', 3, 10, 100, 'squat'),
      pair('2024-03-15', 2, 5, 200, 'accessory'),
    ]);
    expect(result.get('2024-03-15')).toBe(3000 + 2000);
  });

  it('keys by local calendar day regardless of test-runner timezone', () => {
    const sessionDate = d('2024-01-01');
    const result = calculateVolumeCorrelation([pair('2024-01-01', 1, 1, 50)]);
    const expectedKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
    expect(result.has(expectedKey)).toBe(true);
  });
});
