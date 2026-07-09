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

  it('surfaces stale variants in variants with status stale (not unassessed)', () => {
    const report = diagnose(
      [basePt, pt('bench-chains', 80, Date.now() - 40 * 86400000, ['lift:bench'])],
      model,
      map,
      opts,
      undefined
    );

    const staleVariant = report.variants.find((v) => v.canonical === 'bench-chains');
    expect(staleVariant).toBeDefined();
    expect(staleVariant!.status).toBe('stale');
    expect(staleVariant!.ratio).toBeCloseTo(1, 3);
    expect(staleVariant!.averageIndex).toBe(80);
    expect(staleVariant!.expectedBaseline).toBeNull();
    expect(report.unassessed).toEqual([]);
  });

  it('excludes unassessed variants (no lift tag, no factor, no baseline)', () => {
    const report = diagnose(
      [basePt, pt('bench-bands', 70, day(20), ['lift:bench'])],
      model,
      map,
      opts,
      undefined
    );

    expect(report.variants.map((v) => v.canonical)).not.toContain('bench-bands');
    expect(report.unassessed).toEqual(['bench-bands']);
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

    it('stale variants do not contribute votes to weaknesses', () => {
      const report = diagnose(
        [
          basePt,
          pt('bench-chains', 70, Date.now() - 40 * 86400000, ['lift:bench']), // stale weakness
          pt('bench-close-grip', 80, day(20), ['lift:bench']), // fresh weakness
        ],
        model,
        map,
        opts,
        undefined
      );

      // only bench-close-grip (fresh) should contribute votes; bench-chains (stale) should not
      expect(report.weaknesses).toEqual([
        { quality: 'lockout', score: 1, evidence: ['bench-close-grip'] },
        { quality: 'tricep', score: 1, evidence: ['bench-close-grip'] },
      ]);
    });
  });

  describe('addlWtOffset field', () => {
    it.each([
      [
        'present with n > 0',
        { 'bench-chains': { offsetKg: 11.34, n: 5 } },
        { offsetLbs: 25, n: 5 },
      ],
      ['absent', {}, undefined],
      ['present but n === 0', { 'bench-chains': { offsetKg: 11.34, n: 0 } }, undefined],
    ] as const)('includes addlWtOffset when %s', (desc, addlWtOffset, expected) => {
      const testModel: NormalizationModel = { ...model, addlWtOffset };
      const points = [basePt, pt('bench-chains', 80, day(20), ['lift:bench'])];
      const report = diagnose(points, testModel, map, opts, undefined);
      const variant = report.variants.find((v) => v.canonical === 'bench-chains')!;

      if (expected === undefined) {
        expect(variant.addlWtOffset).toBeUndefined();
      } else {
        expect(variant.addlWtOffset?.offsetLbs).toBeCloseTo(expected.offsetLbs, 1);
        expect(variant.addlWtOffset?.n).toBe(expected.n);
      }
    });
  });

  describe('equipment magnitude baseline ranges', () => {
    it('produces distinct expectedBaseline strings for different board magnitudes', () => {
      const boardMap = new Map<string, string[]>([
        ['bench', []],
        ['bench-board', ['tricep']],
        ['bench-board-2', ['tricep']],
        ['bench-board-3', ['tricep']],
      ]);
      const boardModel: NormalizationModel = {
        ...model,
        baseline: { 'lift:bench': 'bench' },
        variantFactor: {
          'bench-board': { factor: 1.05, n: 5 },
          'bench-board-2': { factor: 1.15, n: 5 },
          'bench-board-3': { factor: 1.25, n: 5 },
        },
      };
      const baselineRanges = new Map([
        ['bench', { min: 100, max: 100 }],
        ['bench-board', { min: 105, max: 115 }],
        ['bench-board-2', { min: 115, max: 125 }],
        ['bench-board-3', { min: 125, max: 135 }],
      ]);

      const report = diagnose(
        [
          basePt,
          pt('bench-board', 100, day(20), ['lift:bench']),
          pt('bench-board-2', 110, day(20), ['lift:bench']),
          pt('bench-board-3', 120, day(20), ['lift:bench']),
        ],
        boardModel,
        boardMap,
        opts,
        undefined,
        new Map(),
        baselineRanges
      );

      const board1 = report.variants.find((v) => v.canonical === 'bench-board');
      const board2 = report.variants.find((v) => v.canonical === 'bench-board-2');
      const board3 = report.variants.find((v) => v.canonical === 'bench-board-3');

      expect(board1?.expectedBaseline).toBe('105-115%');
      expect(board2?.expectedBaseline).toBe('115-125%');
      expect(board3?.expectedBaseline).toBe('125-135%');
    });

    it('unmapped magnitude falls back to no range (regression guard)', () => {
      const boardMap = new Map<string, string[]>([
        ['bench', []],
        ['bench-board-4', ['tricep']],
      ]);
      const boardModel: NormalizationModel = {
        ...model,
        baseline: { 'lift:bench': 'bench' },
        variantFactor: {
          'bench-board-4': { factor: 1.35, n: 3 },
        },
      };
      // No explicit range for bench-board-4, so it should fall back to null
      const baselineRanges = new Map([['bench', { min: 100, max: 100 }]]);

      const report = diagnose(
        [basePt, pt('bench-board-4', 140, day(20), ['lift:bench'])],
        boardModel,
        boardMap,
        opts,
        undefined,
        new Map(),
        baselineRanges
      );

      const board4 = report.variants.find((v) => v.canonical === 'bench-board-4');
      expect(board4?.expectedBaseline).toBeNull();
    });
  });
});
