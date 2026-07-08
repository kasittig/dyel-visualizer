import { describe, it, expect } from 'vitest';
import { diagnose } from './diagnose';
import type { NormalizationModel } from '../derive/normalize';
import type { Point } from '../types';

const day = (n: number) => Date.now() - (30 - n) * 86400000;
const pt = (s: string, v: number, t: number, tags: string[]): Point => ({
  t,
  v,
  series: s,
  tags: new Set(tags),
});

const map = new Map<string, string[]>([
  ['bench', []],
  ['bench-chains', ['lockout']],
  ['bench-close-grip', ['lockout', 'tricep']],
  ['bench-paused', ['off-chest']],
]);

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
const basePt = pt('bench', 100, day(20), ['lift:bench']);

describe('diagnose', () => {
  it('assesses baseline itself as optimal', () => {
    const report = diagnose([basePt], model, map, opts, undefined);
    expect(report.variants[0]).toMatchObject({
      canonical: 'bench',
      ratio: 1,
      status: 'optimal',
      effects: [],
    });
  });

  it.each([
    [70, 'weakness', 0.875],
    [90, 'overperforming', 1.125],
    [82, 'optimal', 1.025],
  ] as const)('flags variant at %s kg as %s', (v, status, ratio) => {
    const report = diagnose(
      [basePt, pt('bench-chains', v, day(20), ['lift:bench'])],
      model,
      map,
      opts,
      undefined
    );
    const variant = report.variants.find((x) => x.canonical === 'bench-chains')!;
    expect(variant.status).toBe(status);
    expect(variant.ratio).toBeCloseTo(ratio, 3);
  });

  it('excludes unassessed/stale variants', () => {
    const report = diagnose(
      [
        basePt,
        pt('bench-bands', 70, day(20), ['lift:bench']),
        pt('bench-chains', 80, Date.now() - 40 * 86400000, ['lift:bench']),
      ],
      model,
      map,
      opts,
      undefined
    );

    expect(report.variants.map((v) => v.canonical)).not.toContain('bench-chains');
    expect(report.unassessed).toEqual(['bench-bands', 'bench-chains']);
  });

  describe('weaknesses aggregation', () => {
    it('aggregates and filters quality vote scores', () => {
      const report = diagnose(
        [
          basePt,
          pt('bench-chains', 70, day(20), ['lift:bench']),
          pt('bench-close-grip', 80, day(20), ['lift:bench']),
          pt('bench-paused', 95, day(20), ['lift:bench']),
        ],
        model,
        map,
        opts,
        undefined
      );

      expect(report.weaknesses).toEqual([
        { quality: 'lockout', score: 2, evidence: ['bench-chains', 'bench-close-grip'] },
        { quality: 'tricep', score: 1, evidence: ['bench-close-grip'] },
      ]);
    });

    it('excludes qualities with net score <= 0', () => {
      const report = diagnose(
        [basePt, pt('bench-chains', 90, day(20), ['lift:bench'])],
        model,
        map,
        opts,
        undefined
      );
      expect(report.weaknesses).toEqual([]);
    });
  });
});
