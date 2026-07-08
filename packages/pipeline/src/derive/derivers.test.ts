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

describe('derivers', () => {
  describe('e1rm', () => {
    it('calculates max e1rm over single or multiple sets, sorting variants accurately', () => {
      expect(derivers.e1rm.derive([mockSet(100, 5), mockSet(110, 3), mockSet(95, 8)])).toBe(
        Math.max(100 * (1 + 5 / 30), 110 * (1 + 3 / 30), 95 * (1 + 8 / 30))
      );
      expect(derivers.e1rm.derive([mockSet(100, 5)])).toBeCloseTo(100 * (1 + 5 / 30));
      expect(derivers.e1rm.derive([])).toBe(0);
      expect(derivers.e1rm.derive([mockSet(100, 10), mockSet(120, 1)])).toBeCloseTo(
        Math.max(100 * (1 + 10 / 30), 120)
      );
    });

    it.each([
      ['excludes 2+ set speed-work', [mockSet(85, 3, 9), mockSet(95, 14, 1)], 95 * (1 + 14 / 30)],
      ['keeps genuine single-set', [mockSet(100, 1, 1), mockSet(85, 3, 2)], 100],
      [
        'falls back to speed-work',
        [mockSet(85, 3, 9), mockSet(90, 3, 10)],
        Math.max(85 * (1 + 3 / 30), 90 * (1 + 3 / 30)),
      ],
      ['treats missing sets as genuine', [mockSet(100, 5)], 100 * (1 + 5 / 30)],
      [
        'trusts explicit RPE at 2+ sets',
        [mockSet(85, 3, 9), mockSet(120, 1, 3, 9)],
        120 * (1 + (1 + (10 - 9)) / 30),
      ],
    ])('%s', (_msg, sets, expected) => {
      expect(derivers.e1rm.derive(sets)).toBeCloseTo(expected);
    });
  });

  describe('e1rm-max-effort', () => {
    it.each([
      ['returns effort alongside speed-work', [mockSet(100, 1, 1), mockSet(85, 3, 9)], 100],
      [
        'trusts explicit RPE at 2+ sets',
        [mockSet(85, 3, 9), mockSet(120, 1, 3, 9)],
        120 * (1 + (1 + (10 - 9)) / 30),
      ],
    ])('%s', (_msg, sets, expected) => {
      expect(derivers['e1rm-max-effort'].derive(sets)).toBeCloseTo(expected);
    });

    it('returns null for speed-work only or empty days', () => {
      expect(derivers.e1rm.derive([mockSet(85, 3, 9), mockSet(90, 3, 10)])).toEqual(
        expect.any(Number)
      );
      expect(
        derivers['e1rm-max-effort'].derive([mockSet(85, 3, 9), mockSet(90, 3, 10)])
      ).toBeNull();
      expect(derivers['e1rm-max-effort'].derive([])).toBeNull();
    });
  });

  describe('tonnage', () => {
    it('calculates sum of weight * reps across metrics', () => {
      expect(derivers.tonnage.derive([mockSet(100, 5), mockSet(110, 3), mockSet(95, 8)])).toBe(
        100 * 5 + 110 * 3 + 95 * 8
      );
      expect(derivers.tonnage.derive([mockSet(100, 5)])).toBe(500);
      expect(derivers.tonnage.derive([])).toBe(0);
      expect(derivers.tonnage.derive([mockSet(50, 1), mockSet(100, 2), mockSet(200, 3)])).toBe(
        50 * 1 + 100 * 2 + 200 * 3
      );
      expect(derivers.tonnage.derive([mockSet(100, 0), mockSet(100, 5)])).toBe(500);
    });
  });

  describe('top-set', () => {
    it('returns max weight over all sets ignoring rep bounds', () => {
      expect(derivers['top-set'].derive([mockSet(100, 5), mockSet(110, 3), mockSet(95, 8)])).toBe(
        110
      );
      expect(derivers['top-set'].derive([mockSet(100, 20), mockSet(110, 1)])).toBe(110);
      expect(derivers['top-set'].derive([mockSet(100, 5)])).toBe(100);
      expect(derivers['top-set'].derive([])).toBe(0);
      expect(derivers['top-set'].derive([mockSet(100, 5), mockSet(100, 3)])).toBe(100);
    });
  });

  describe('deriver registry', () => {
    it('verifies registry keys, lookups, and explicit invocation structures', () => {
      expect(Object.keys(derivers)).toEqual(
        expect.arrayContaining(['e1rm', 'e1rm-max-effort', 'tonnage', 'top-set'])
      );
      expect(derivers.e1rm.id).toBe('e1rm');
      expect(derivers.tonnage.id).toBe('tonnage');
      expect(derivers['top-set'].id).toBe('top-set');

      const sets = [mockSet(100, 5)];
      ['e1rm', 'tonnage', 'top-set'].forEach((id) => {
        expect(typeof derivers[id as keyof typeof derivers].derive).toBe('function');
        expect(derivers[id as keyof typeof derivers].derive(sets)).not.toBeUndefined();
      });
    });
  });
});
