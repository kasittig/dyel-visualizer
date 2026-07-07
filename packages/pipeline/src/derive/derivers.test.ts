import { describe, it, expect } from 'vitest';
import { derivers } from './derivers';
import type { TaggedSetRecord } from '../tag/tag';

const mockSet = (weight: number, reps: number, sets?: number, rpe?: number): TaggedSetRecord => ({
  date: 1706745600000,
  exercise: 'Bench',
  weight,
  reps,
  rpe,
  canonical: 'bench',
  tags: new Set(['lift:bench']),
  ...(sets !== undefined && { meta: { sets: String(sets) } }),
});

describe('derivers', () => {
  describe('e1rm', () => {
    it('returns max e1rm over multiple sets', () => {
      const sets = [mockSet(100, 5), mockSet(110, 3), mockSet(95, 8)];
      const e1rms = [
        100 * (1 + 5 / 30), // ≈116.67
        110 * (1 + 3 / 30), // ≈121
        95 * (1 + 8 / 30), // ≈120.33
      ];
      expect(derivers.e1rm.derive(sets)).toBe(Math.max(...e1rms));
    });

    it('handles single set correctly', () => {
      const sets = [mockSet(100, 5)];
      const expected = 100 * (1 + 5 / 30);
      expect(derivers.e1rm.derive(sets)).toBeCloseTo(expected);
    });

    it('returns 0 for empty sets', () => {
      expect(derivers.e1rm.derive([])).toBe(0);
    });

    it('prioritizes heavier weight over more reps', () => {
      const sets = [mockSet(100, 10), mockSet(120, 1)];
      const e1rms = [100 * (1 + 10 / 30), 120];
      expect(derivers.e1rm.derive(sets)).toBe(Math.max(...e1rms));
    });

    it.each([
      [
        'excludes a 2+ set speed-work entry in favor of a genuine effort set',
        [mockSet(85, 3, 9), mockSet(95, 14, 1)],
        95 * (1 + 14 / 30),
      ],
      [
        'keeps a genuine single-set effort over a 2-set speed-work entry',
        [mockSet(100, 1, 1), mockSet(85, 3, 2)],
        100,
      ],
      [
        'falls back to speed-work sets when nothing else is available that day',
        [mockSet(85, 3, 9), mockSet(90, 3, 10)],
        Math.max(85 * (1 + 3 / 30), 90 * (1 + 3 / 30)),
      ],
      [
        'treats a missing sets count as a single genuine effort set',
        [mockSet(100, 5)],
        100 * (1 + 5 / 30),
      ],
      [
        'trusts an explicit RPE even at 2+ sets, not treating it as speed work',
        [mockSet(85, 3, 9), mockSet(120, 1, 3, 9)],
        120 * (1 + (1 + (10 - 9)) / 30),
      ],
    ])('%s', (_, sets, expected) => {
      expect(derivers.e1rm.derive(sets)).toBeCloseTo(expected);
    });
  });

  describe('tonnage', () => {
    it('calculates sum of weight * reps', () => {
      const sets = [mockSet(100, 5), mockSet(110, 3), mockSet(95, 8)];
      const expected = 100 * 5 + 110 * 3 + 95 * 8;
      expect(derivers.tonnage.derive(sets)).toBe(expected);
    });

    it('handles single set', () => {
      const sets = [mockSet(100, 5)];
      expect(derivers.tonnage.derive(sets)).toBe(500);
    });

    it('returns 0 for empty sets', () => {
      expect(derivers.tonnage.derive([])).toBe(0);
    });

    it('accounts for all sets regardless of weight', () => {
      const sets = [mockSet(50, 1), mockSet(100, 2), mockSet(200, 3)];
      const expected = 50 * 1 + 100 * 2 + 200 * 3;
      expect(derivers.tonnage.derive(sets)).toBe(expected);
    });

    it('handles zero reps correctly', () => {
      const sets = [mockSet(100, 0), mockSet(100, 5)];
      const expected = 100 * 0 + 100 * 5;
      expect(derivers.tonnage.derive(sets)).toBe(expected);
    });
  });

  describe('top-set', () => {
    it('returns max weight over all sets', () => {
      const sets = [mockSet(100, 5), mockSet(110, 3), mockSet(95, 8)];
      expect(derivers['top-set'].derive(sets)).toBe(110);
    });

    it('ignores reps in weight calculation', () => {
      const sets = [mockSet(100, 20), mockSet(110, 1)];
      expect(derivers['top-set'].derive(sets)).toBe(110);
    });

    it('handles single set', () => {
      const sets = [mockSet(100, 5)];
      expect(derivers['top-set'].derive(sets)).toBe(100);
    });

    it('returns 0 for empty sets', () => {
      expect(derivers['top-set'].derive([])).toBe(0);
    });

    it('handles equal weights', () => {
      const sets = [mockSet(100, 5), mockSet(100, 3)];
      expect(derivers['top-set'].derive(sets)).toBe(100);
    });
  });

  describe('deriver registry', () => {
    it('has all three derivers registered', () => {
      expect(Object.keys(derivers)).toContain('e1rm');
      expect(Object.keys(derivers)).toContain('tonnage');
      expect(Object.keys(derivers)).toContain('top-set');
    });

    it('can lookup each deriver by id', () => {
      expect(derivers.e1rm.id).toBe('e1rm');
      expect(derivers.tonnage.id).toBe('tonnage');
      expect(derivers['top-set'].id).toBe('top-set');
    });

    it('each deriver has a derive method', () => {
      const sets = [mockSet(100, 5)];
      expect(typeof derivers.e1rm.derive).toBe('function');
      expect(typeof derivers.tonnage.derive).toBe('function');
      expect(typeof derivers['top-set'].derive).toBe('function');
      expect(derivers.e1rm.derive(sets)).not.toBeUndefined();
      expect(derivers.tonnage.derive(sets)).not.toBeUndefined();
      expect(derivers['top-set'].derive(sets)).not.toBeUndefined();
    });
  });
});
