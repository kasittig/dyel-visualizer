import { describe, it, expect } from 'vitest';
import { buildTabRows } from './appDataUtils';
import type { ConjugateDataPair, LiftType } from '@dyel/core';

function pair(type: LiftType, sets: number, rpe: number | null = null): ConjugateDataPair {
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
      date: new Date('2024-01-01T00:00:00'),
      sets,
      reps: 5,
      weight: 100,
      e1rm: 120,
      unit: 'lbs',
      rpe,
    },
  ];
}

describe('buildTabRows — volume split', () => {
  it('puts single-set big-three sessions in maxEffort', () => {
    const rows = buildTabRows({ squat: [pair('squat', 1)] });
    expect(rows.squat.maxEffort).toHaveLength(1);
    expect(rows.squat.volume).toHaveLength(0);
  });

  it('puts multi-set sessions without RPE in volume', () => {
    const rows = buildTabRows({ squat: [pair('squat', 5)] });
    expect(rows.squat.maxEffort).toHaveLength(0);
    expect(rows.squat.volume).toHaveLength(1);
  });

  it('puts multi-set sessions with RPE in maxEffort', () => {
    const rows = buildTabRows({ bench: [pair('bench', 3, 8)] });
    expect(rows.bench.maxEffort).toHaveLength(1);
    expect(rows.bench.volume).toHaveLength(0);
  });

  it('never splits accessories into volume', () => {
    const rows = buildTabRows({ accessory: [pair('accessory', 10)] });
    expect(rows.accessory.maxEffort).toHaveLength(1);
    expect(rows.accessory.volume).toHaveLength(0);
  });

  it('all contains every session', () => {
    const pairs = [pair('deadlift', 1), pair('deadlift', 5)];
    const rows = buildTabRows({ deadlift: pairs });
    expect(rows.deadlift.all).toHaveLength(2);
    expect(rows.deadlift.maxEffort).toHaveLength(1);
    expect(rows.deadlift.volume).toHaveLength(1);
  });
});
