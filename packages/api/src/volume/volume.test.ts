import { describe, it, expect } from 'vitest';
import { calculateVolumeCorrelation, calculateVolumeCorrelationFromTagged } from './volume.ts';
import type {
  ConjugateDataPair,
  ConjugateExercise,
  TrainingSession,
} from '@dyel/core/src/types/conjugate.ts';
import type { TaggedSetRecord } from '@dyel/pipeline';

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
