import { describe, it, expect } from 'vitest';
import { derivers } from './derivers';
import type { TaggedSetRecord } from '../tag/tag';

const mockSet = (w: number, reps: number, sets?: number, rpe?: number): TaggedSetRecord => ({
  date: 1706745600000,
  exercise: 'Bench',
  weight: w,
  reps,
  rpe,
  canonical: 'bench',
  tags: new Set(['lift:bench']),
  effects: [],
  baselineRange: null,
  ...(sets !== undefined && { meta: { sets: String(sets) } }),
});

describe('derivers logic suites', () => {
  it('evaluates e1rm, tonnage, top-set, and registry properties accurately', () => {
    const list = [mockSet(100, 5), mockSet(110, 3), mockSet(95, 8)];
    expect(derivers.e1rm.derive(list)).toBe(
      Math.max(100 * 1.1666666666666667, 110 * 1.1, 95 * 1.2666666666666666)
    );
    expect(derivers.e1rm.derive([mockSet(100, 5)])).toBeCloseTo(116.66666);
    expect(derivers.e1rm.derive([])).toBe(0);

    const speedCases: [string, TaggedSetRecord[], number][] = [
      ['excludes 2+ set speed-work', [mockSet(85, 3, 9), mockSet(95, 14, 1)], 95 * (1 + 14 / 30)],
      ['keeps genuine single-set', [mockSet(100, 1, 1), mockSet(85, 3, 2)], 100],
      [
        'falls back to speed-work',
        [mockSet(85, 3, 9), mockSet(90, 3, 10)],
        Math.max(85 * 1.1, 90 * 1.1),
      ],
      ['treats missing sets as genuine', [mockSet(100, 5)], 116.66666],
      [
        'trusts explicit RPE at 2+ sets',
        [mockSet(85, 3, 9), mockSet(120, 1, 3, 9)],
        120 * (1 + 2 / 30),
      ],
    ];
    speedCases.forEach(([, sets, exp]) => expect(derivers.e1rm.derive(sets)).toBeCloseTo(exp));

    expect(derivers.tonnage.derive(list)).toBe(1590);
    expect(derivers.tonnage.derive([])).toBe(0);

    expect(derivers['top-set'].derive(list)).toBe(110);
    expect(derivers['top-set'].derive([])).toBe(0);

    expect(Object.keys(derivers)).toEqual(
      expect.arrayContaining(['e1rm', 'e1rm-max-effort', 'tonnage', 'top-set'])
    );
    expect(derivers.e1rm.id).toBe('e1rm');
  });

  it('evaluates specific e1rm-max-effort speed-work exceptions and null boundaries', () => {
    const meCases: [string, TaggedSetRecord[], number][] = [
      ['returns effort alongside speed-work', [mockSet(100, 1, 1), mockSet(85, 3, 9)], 100],
      ['ignores sets above five reps', [mockSet(100, 5), mockSet(110, 6)], 100 * (1 + 5 / 30)],
      [
        'trusts explicit RPE at 2+ sets',
        [mockSet(85, 3, 9), mockSet(120, 1, 3, 9)],
        120 * (1 + 2 / 30),
      ],
    ];
    meCases.forEach(([, sets, exp]) =>
      expect(derivers['e1rm-max-effort'].derive(sets)).toBeCloseTo(exp)
    );

    expect(derivers['e1rm-max-effort'].derive([mockSet(85, 3, 9), mockSet(90, 3, 10)])).toBeNull();
    expect(derivers['e1rm-max-effort'].derive([mockSet(100, 6, 1, 10)])).toBeNull();
    expect(derivers['e1rm-max-effort'].derive([])).toBeNull();
  });
});
