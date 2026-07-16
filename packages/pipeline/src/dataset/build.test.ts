import { describe, it, expect } from 'vitest';
import { buildDataset } from './build';
import type { SeriesSpec, CompositeSpec, RenderParams, RechartsRow } from './build';
import type { Point } from '../types';
import type { NormalizationModel } from '../derive/normalize';

const day = (n: number) => Date.UTC(2024, 0, n);
const pt = (s: string, v: number, t: number, tags: string[] = []): Point => ({
  t,
  v,
  series: s,
  tags: new Set(tags),
});
const mockModel = (ov?: Partial<NormalizationModel>) => ({
  fittedAt: 0,
  baseline: {},
  variantFactor: {},
  addlWtOffset: {},
  ...ov,
});
const athlete = { sex: 'M' as const, bodyweight: 83 };
const noUi: RenderParams = {};

describe('buildDataset Series & Composite Specs', () => {
  const sSpec = (inc: SeriesSpec['include']): SeriesSpec => ({
    id: 'e1rm-per-lift',
    kind: 'series',
    include: inc,
    derive: 'e1rm',
  });
  const cSpec = (comp: CompositeSpec['components']): CompositeSpec => ({
    id: 'estimated-total',
    kind: 'composite',
    components: comp,
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
  });
  const lifts = [
    { label: 'squat', include: { all: ['lift:squat'] } },
    { label: 'bench', include: { all: ['lift:bench'] } },
  ];

  it('pivots series entries and processes matrix constraints', () => {
    const pts = [
      pt('bench', 100, day(1), ['lift:bench']),
      pt('ohp', 50, day(1), ['lift:ohp']),
      pt('bench', 105, day(2), ['lift:bench']),
    ];
    expect(buildDataset(pts, sSpec({}), noUi, mockModel(), athlete)).toEqual([
      { t: day(1), bench: 100, ohp: 50 },
      { t: day(2), bench: 105 },
    ]);

    type Matrix = [string, SeriesSpec['include'], Point[], RechartsRow[], RenderParams | undefined];
    const cases: Matrix[] = [
      [
        'all',
        { all: ['lift:bench', 'addl:chains'] },
        [
          pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
          pt('bench', 100, day(1), ['lift:bench']),
        ],
        [{ t: day(1), 'bench-chains': 90 }],
        noUi,
      ],
      [
        'any',
        { any: ['lift:bench'] },
        [pt('bench', 100, day(1), ['lift:bench']), pt('squat', 200, day(1), ['lift:squat'])],
        [{ t: day(1), bench: 100 }],
        noUi,
      ],
      [
        'none',
        { all: ['lift:bench'], none: ['addl:chains'] },
        [
          pt('bench', 100, day(1), ['lift:bench']),
          pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
        ],
        [{ t: day(1), bench: 100 }],
        noUi,
      ],
      ['id', { any: ['bench'] }, [pt('bench', 100, day(1), [])], [{ t: day(1), bench: 100 }], noUi],
      [
        'chip inc',
        { all: ['lift:bench'] },
        [
          pt('bench', 100, day(1), ['lift:bench']),
          pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
        ],
        [{ t: day(1), 'bench-chains': 90 }],
        { chips: { include: ['addl:chains'], exclude: [] } },
      ],
      [
        'chip exc',
        { all: ['lift:bench'] },
        [
          pt('bench', 100, day(1), ['lift:bench']),
          pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
        ],
        [{ t: day(1), bench: 100 }],
        { chips: { include: [], exclude: ['addl:chains'] } },
      ],
      ['empty', {}, [], [], noUi],
    ];

    cases.forEach(([, inc, p, exp, ui]) => {
      expect(buildDataset(p, sSpec(inc), ui ?? noUi, mockModel(), athlete)).toEqual(exp);
    });
  });

  it('evaluates composites, historical fills, date scopes, and design C overrides', () => {
    const m = mockModel({
      baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' },
      variantFactor: { 'squat-chains': { factor: 0.8, n: 5 } },
    });
    const p1 = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat-chains', 100, day(1), ['lift:squat', 'addl:chains']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    expect(buildDataset(p1, cSpec(lifts), noUi, m, athlete)).toEqual([
      { t: day(1), 'estimated-total': 300 },
    ]);

    const mUnfitted = mockModel({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const p2 = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat-chains', 999, day(1), ['lift:squat', 'addl:chains']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    expect(buildDataset(p2, cSpec(lifts), noUi, mUnfitted, athlete)).toEqual([
      { t: day(1), 'estimated-total': 300 },
    ]);

    const p3 = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat', 220, day(20), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
      pt('bench', 110, day(5), ['lift:bench']),
      pt('bench', 115, day(10), ['lift:bench']),
    ];
    expect(buildDataset(p3, cSpec(lifts), noUi, mUnfitted, athlete)).toEqual([
      { t: day(1), 'estimated-total': 300 },
      { t: day(5), 'estimated-total': 310 },
      { t: day(10), 'estimated-total': 315 },
      { t: day(20), 'estimated-total': 335 },
    ]);

    const p4 = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(5), ['lift:bench']),
      pt('bench', 110, day(10), ['lift:bench']),
      pt('squat', 220, day(20), ['lift:squat']),
    ];
    expect(
      buildDataset(p4, cSpec(lifts), { dateRange: [day(5), day(31)] }, mUnfitted, athlete)
    ).toEqual([
      { t: day(5), 'estimated-total': 300 },
      { t: day(10), 'estimated-total': 310 },
      { t: day(20), 'estimated-total': 330 },
    ]);

    const p5 = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat', 210, day(5), ['lift:squat']),
      pt('bench', 100, day(10), ['lift:bench']),
    ];
    expect(buildDataset(p5, cSpec(lifts), noUi, mUnfitted, athlete)).toEqual([
      { t: day(10), 'estimated-total': 310 },
    ]);

    const mC = mockModel({
      baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' },
      variantFactor: { 'bench-chains': { factor: 1.0, n: 2 } },
      addlWtOffset: { 'bench-chains': { offsetKg: 20, n: 2 } },
    });
    const p6 = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
      pt('bench-chains', 100, day(1), ['lift:bench', 'addl:chains']),
    ];
    expect(buildDataset(p6, cSpec(lifts), noUi, mC, athlete)).toEqual([
      { t: day(1), 'estimated-total': 300 },
    ]);

    // Test carry-forward with dateRange: bench before range, squat within range
    // Bug scenario: a lifter benches in December, squats in January
    const p7 = [
      pt('bench', 100, day(1), ['lift:bench']),
      pt('squat', 200, day(10), ['lift:squat']),
      pt('squat', 220, day(20), ['lift:squat']),
    ];
    expect(
      buildDataset(p7, cSpec(lifts), { dateRange: [day(5), day(31)] }, mUnfitted, athlete)
    ).toEqual([
      { t: day(10), 'estimated-total': 300 },
      { t: day(20), 'estimated-total': 320 },
    ]);
  });
});
