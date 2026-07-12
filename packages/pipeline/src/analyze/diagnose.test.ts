import { describe, it, expect } from 'vitest';
import { diagnose } from './diagnose';
import type { NormalizationModel } from '../derive/normalize';
import type { Point } from '../types';

const day = (n: number) => Date.now() - (30 - n) * 86400000;
const pt = (s: string, v: number, t: number): Point => ({
  t,
  v,
  series: s,
  tags: new Set(['lift:bench']),
});

const map = new Map([
  ['bench', []],
  ['bench-chains', ['lockout']],
  ['bench-close-grip', ['lockout', 'tricep']],
  ['bench-paused', ['off-chest']],
]);
const basePt = pt('bench', 100, day(20));
const opts = { tolerance: 0.05, staleDays: 30 };

const model: NormalizationModel = {
  fittedAt: day(1),
  baseline: { 'lift:bench': 'bench' },
  addlWtOffset: {},
  variantFactor: {
    'bench-chains': { factor: 0.8, n: 5 },
    'bench-close-grip': { factor: 0.9, n: 5 },
    'bench-paused': { factor: 0.85, n: 5 },
  },
};

describe('diagnose evaluations', () => {
  it('assesses baseline optimal bounds and variant metrics correctly', () => {
    const report = diagnose([basePt], model, map, opts, undefined);
    expect(report.variants[0]).toMatchObject({ canonical: 'bench', ratio: 1, status: 'optimal' });

    const checks = [
      [70, 'weakness', 0.875],
      [90, 'overperforming', 1.125],
      [82, 'optimal', 1.025],
    ] as const;
    checks.forEach(([v, status, ratio]) => {
      const res = diagnose([basePt, pt('bench-chains', v, day(20))], model, map, opts, undefined);
      const variant = res.variants.find((x) => x.canonical === 'bench-chains')!;
      expect(variant.status).toBe(status);
      expect(variant.ratio).toBeCloseTo(ratio, 3);
    });

    const stale = diagnose(
      [basePt, pt('bench-chains', 80, Date.now() - 40 * 86400000)],
      model,
      map,
      opts,
      undefined
    );
    expect(stale.variants.find((v) => v.canonical === 'bench-chains')?.status).toBe('stale');
    expect(stale.unassessed).toEqual([]);

    const unassessed = diagnose(
      [basePt, pt('bench-bands', 70, day(20))],
      model,
      map,
      opts,
      undefined
    );
    expect(unassessed.unassessed).toEqual(['bench-bands']);
  });

  it('aggregates weaknesses and filters out stale or sub-zero metrics', () => {
    const fresh = diagnose(
      [
        basePt,
        pt('bench-chains', 70, day(20)),
        pt('bench-close-grip', 80, day(20)),
        pt('bench-paused', 95, day(20)),
      ],
      model,
      map,
      opts,
      undefined
    );
    expect(fresh.weaknesses).toEqual([
      { quality: 'lockout', score: 2, evidence: ['bench-chains', 'bench-close-grip'] },
      { quality: 'tricep', score: 1, evidence: ['bench-close-grip'] },
    ]);

    expect(
      diagnose([basePt, pt('bench-chains', 90, day(20))], model, map, opts, undefined).weaknesses
    ).toEqual([]);

    const mixed = diagnose(
      [
        basePt,
        pt('bench-chains', 70, Date.now() - 40 * 86400000),
        pt('bench-close-grip', 80, day(20)),
      ],
      model,
      map,
      opts,
      undefined
    );
    expect(mixed.weaknesses).toEqual([
      { quality: 'lockout', score: 1, evidence: ['bench-close-grip'] },
      { quality: 'tricep', score: 1, evidence: ['bench-close-grip'] },
    ]);
  });

  it('handles addlWtOffset contexts and processes expected baseline ranges', () => {
    const activeWt = diagnose(
      [basePt, pt('bench-chains', 80, day(20))],
      { ...model, addlWtOffset: { 'bench-chains': { offsetKg: 11.34, n: 5 } } },
      map,
      opts,
      undefined
    ).variants.find((v) => v.canonical === 'bench-chains');
    expect(activeWt?.addlWtOffset?.offsetKg).toBe(11.34);

    const emptyWt = diagnose(
      [basePt, pt('bench-chains', 80, day(20))],
      { ...model, addlWtOffset: { 'bench-chains': { offsetKg: 11.34, n: 0 } } },
      map,
      opts,
      undefined
    ).variants.find((v) => v.canonical === 'bench-chains');
    expect(emptyWt?.addlWtOffset).toBeUndefined();

    const boardModel = {
      ...model,
      variantFactor: {
        'bench-board': { factor: 1.05, n: 5 },
        'bench-board-2': { factor: 1.15, n: 5 },
      },
    };
    const ranges = new Map([
      ['bench-board', { min: 105, max: 115 }],
      ['bench-board-2', { min: 115, max: 125 }],
    ]);
    const boards = diagnose(
      [basePt, pt('bench-board', 100, day(20)), pt('bench-board-2', 110, day(20))],
      boardModel,
      map,
      opts,
      undefined,
      new Map(),
      ranges
    );
    expect(boards.variants.find((v) => v.canonical === 'bench-board')?.expectedBaseline).toBe(
      '105-115%'
    );
    expect(boards.variants.find((v) => v.canonical === 'bench-board-2')?.expectedBaseline).toBe(
      '115-125%'
    );

    const unmapped = diagnose(
      [basePt, pt('bench-board-4', 140, day(20))],
      { ...model, variantFactor: { 'bench-board-4': { factor: 1.35, n: 3 } } },
      map,
      opts,
      undefined,
      new Map(),
      new Map()
    );
    expect(
      unmapped.variants.find((v) => v.canonical === 'bench-board-4')?.expectedBaseline
    ).toBeNull();
  });
});
