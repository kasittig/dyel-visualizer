import { describe, it, expect } from 'vitest';
import { diagnose } from './diagnose';
import type { ExerciseTagMap } from '../tag/tag';
import type { NormalizationModel } from '../derive/normalize';
import type { Point } from '../types';

const day = (n: number) => Date.now() - (30 - n) * 86400000;

const pt = (series: string, v: number, t: number, tags: string[]): Point => ({
  t,
  v,
  series,
  tags: new Set(tags),
});

const map: ExerciseTagMap = {
  bench: { tags: ['lift:bench', 'comp-lift'] },
  'bench-chains': { tags: ['lift:bench', 'addl:chains'], effects: ['lockout'] },
  'bench-close-grip': { tags: ['lift:bench', 'variation'], effects: ['lockout', 'tricep'] },
  'bench-paused': { tags: ['lift:bench', 'variation'], effects: ['off-chest'] },
};

const model: NormalizationModel = {
  fittedAt: day(1),
  baseline: { 'lift:bench': 'bench' },
  variantFactor: {
    'bench-chains': { factor: 0.8, n: 5 },
    'bench-close-grip': { factor: 0.9, n: 5 },
    'bench-paused': { factor: 0.85, n: 5 },
  },
  addlWtOffset: {},
};

const opts = { tolerance: 0.05, staleDays: 30 };

describe('diagnose', () => {
  it('assesses the baseline canonical itself as optimal (factor 1, trivial ratio)', () => {
    const points = [pt('bench', 100, day(20), ['lift:bench', 'comp-lift'])];
    const report = diagnose(points, model, map, opts);
    expect(report.variants).toEqual([
      expect.objectContaining({
        canonical: 'bench',
        lift: 'lift:bench',
        expectedE1rmKg: 100,
        actualE1rmKg: 100,
        ratio: 1,
        status: 'optimal',
        effects: [],
      }),
    ]);
  });

  it('flags a variant below the tolerance band as a weakness', () => {
    const points = [
      pt('bench', 100, day(20), ['lift:bench', 'comp-lift']),
      pt('bench-chains', 70, day(20), ['lift:bench', 'addl:chains']),
    ];
    const report = diagnose(points, model, map, opts);
    const variant = report.variants.find((v) => v.canonical === 'bench-chains')!;
    expect(variant.expectedE1rmKg).toBe(80);
    expect(variant.ratio).toBeCloseTo(0.875, 5);
    expect(variant.status).toBe('weakness');
    expect(variant.effects).toEqual(['lockout']);
  });

  it('flags a variant above the tolerance band as overperforming', () => {
    const points = [
      pt('bench', 100, day(20), ['lift:bench', 'comp-lift']),
      pt('bench-chains', 90, day(20), ['lift:bench', 'addl:chains']),
    ];
    const report = diagnose(points, model, map, opts);
    const variant = report.variants.find((v) => v.canonical === 'bench-chains')!;
    expect(variant.ratio).toBeCloseTo(1.125, 5);
    expect(variant.status).toBe('overperforming');
  });

  it('treats a ratio within the tolerance band as optimal', () => {
    const points = [
      pt('bench', 100, day(20), ['lift:bench', 'comp-lift']),
      pt('bench-chains', 82, day(20), ['lift:bench', 'addl:chains']),
    ];
    const report = diagnose(points, model, map, opts);
    const variant = report.variants.find((v) => v.canonical === 'bench-chains')!;
    expect(variant.status).toBe('optimal');
  });

  it('excludes a canonical with no fitted variantFactor entry, listing it in unassessed', () => {
    const points = [
      pt('bench', 100, day(20), ['lift:bench', 'comp-lift']),
      pt('bench-bands', 70, day(20), ['lift:bench', 'addl:bands']),
    ];
    const report = diagnose(points, model, map, opts);
    expect(report.variants.some((v) => v.canonical === 'bench-bands')).toBe(false);
    expect(report.unassessed).toContain('bench-bands');
  });

  it('excludes a stale canonical (latest point older than opts.staleDays), listing it in unassessed', () => {
    const now = Date.now();
    const staleT = now - 40 * 86400000;
    const points = [
      pt('bench', 100, now - 1000, ['lift:bench', 'comp-lift']),
      pt('bench-chains', 80, staleT, ['lift:bench', 'addl:chains']),
    ];
    const report = diagnose(points, model, map, opts);
    expect(report.variants.some((v) => v.canonical === 'bench-chains')).toBe(false);
    expect(report.unassessed).toContain('bench-chains');
  });

  it('copies effects verbatim from the exercise map, defaulting to [] when absent', () => {
    const points = [pt('bench', 100, day(20), ['lift:bench', 'comp-lift'])];
    const report = diagnose(points, model, map, opts);
    expect(report.variants[0].effects).toEqual([]);
  });

  describe('weaknesses aggregation', () => {
    it('aggregates a signed vote count per quality across weakness/overperforming/optimal variants', () => {
      const points = [
        pt('bench', 100, day(20), ['lift:bench', 'comp-lift']),
        // weakness, effects: ['lockout']
        pt('bench-chains', 70, day(20), ['lift:bench', 'addl:chains']),
        // weakness, effects: ['lockout', 'tricep']
        pt('bench-close-grip', 80, day(20), ['lift:bench', 'variation']),
        // overperforming, effects: ['off-chest']
        pt('bench-paused', 95, day(20), ['lift:bench', 'variation']),
      ];
      const report = diagnose(points, model, map, opts);

      const lockout = report.weaknesses.find((w) => w.quality === 'lockout');
      expect(lockout).toEqual({
        quality: 'lockout',
        score: 2,
        evidence: expect.arrayContaining(['bench-chains', 'bench-close-grip']),
      });

      const tricep = report.weaknesses.find((w) => w.quality === 'tricep');
      expect(tricep).toEqual({ quality: 'tricep', score: 1, evidence: ['bench-close-grip'] });

      // off-chest scored -1 (overperforming) — must not appear (score must be > 0)
      expect(report.weaknesses.find((w) => w.quality === 'off-chest')).toBeUndefined();
    });

    it('excludes qualities with a net score of 0 or below', () => {
      const points = [
        pt('bench', 100, day(20), ['lift:bench', 'comp-lift']),
        // overperforming, effects: ['lockout']
        pt('bench-chains', 90, day(20), ['lift:bench', 'addl:chains']),
      ];
      const report = diagnose(points, model, map, opts);
      expect(report.weaknesses).toEqual([]);
    });
  });
});
