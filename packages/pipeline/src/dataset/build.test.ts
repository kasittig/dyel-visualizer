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

const model = (overrides?: Partial<NormalizationModel>): NormalizationModel => ({
  fittedAt: 0,
  baseline: {},
  variantFactor: {},
  addlWtOffset: {},
  ...overrides,
});

const athlete = { sex: 'M' as const, bodyweight: 83, deadliftStance: 'conventional' as const };
const noUi: RenderParams = {};

describe('buildDataset — SeriesSpec', () => {
  const spec = (include: SeriesSpec['include']): SeriesSpec => ({
    id: 'e1rm-per-lift',
    kind: 'series',
    include,
    derive: 'e1rm',
  });

  it('pivots matching points by canonical into columns', () => {
    const points = [
      pt('bench', 100, day(1), ['lift:bench']),
      pt('ohp', 50, day(1), ['lift:ohp']),
      pt('bench', 105, day(2), ['lift:bench']),
    ];
    expect(buildDataset(points, spec({}), noUi, model(), athlete)).toEqual([
      { t: day(1), bench: 100, ohp: 50 },
      { t: day(2), bench: 105 },
    ]);
  });

  // Explicit, strict type tuple with zero 'any' references
  type TestMatrix = [
    string,
    SeriesSpec['include'],
    Point[],
    RechartsRow[],
    RenderParams | undefined,
  ];

  it.each<TestMatrix>([
    [
      'all (AND)',
      { all: ['lift:bench', 'addl:chains'] },
      [
        pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
        pt('bench', 100, day(1), ['lift:bench']),
      ],
      [{ t: day(1), 'bench-chains': 90 }],
      noUi,
    ],
    [
      'any (OR)',
      { any: ['lift:bench'] },
      [pt('bench', 100, day(1), ['lift:bench']), pt('squat', 200, day(1), ['lift:squat'])],
      [{ t: day(1), bench: 100 }],
      noUi,
    ],
    [
      'none (exclusion)',
      { all: ['lift:bench'], none: ['addl:chains'] },
      [
        pt('bench', 100, day(1), ['lift:bench']),
        pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
      ],
      [{ t: day(1), bench: 100 }],
      noUi,
    ],
    [
      'canonical id identity match',
      { any: ['bench'] },
      [pt('bench', 100, day(1), [])],
      [{ t: day(1), bench: 100 }],
      noUi,
    ],
    [
      'chips.include narrows further',
      { all: ['lift:bench'] },
      [
        pt('bench', 100, day(1), ['lift:bench']),
        pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
      ],
      [{ t: day(1), 'bench-chains': 90 }],
      { chips: { include: ['addl:chains'], exclude: [] } },
    ],
    [
      'chips.exclude removes points',
      { all: ['lift:bench'] },
      [
        pt('bench', 100, day(1), ['lift:bench']),
        pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
      ],
      [{ t: day(1), bench: 100 }],
      { chips: { include: [], exclude: ['addl:chains'] } },
    ],
    [
      'empty chips array is no-op',
      { all: ['lift:bench'] },
      [pt('bench', 100, day(1), ['lift:bench'])],
      [{ t: day(1), bench: 100 }],
      { chips: { include: [], exclude: [] } },
    ],
    [
      'undefined chips is no-op',
      { all: ['lift:bench'] },
      [pt('bench', 100, day(1), ['lift:bench'])],
      [{ t: day(1), bench: 100 }],
      undefined,
    ],
    [
      'any works alongside chip merge',
      { any: ['lift:bench', 'lift:squat'] },
      [pt('bench', 100, day(1), ['lift:bench']), pt('squat', 200, day(1), ['lift:squat'])],
      [{ t: day(1), bench: 100 }],
      { chips: { include: [], exclude: ['lift:squat'] } },
    ],
    ['empty returns empty array', {}, [], [], noUi],
    [
      'no matches returns empty array',
      { all: ['lift:squat'] },
      [pt('bench', 100, day(1), ['lift:bench'])],
      [],
      noUi,
    ],
  ])('filters correctly with %s', (_, include, points, expected, ui) => {
    expect(buildDataset(points, spec(include), ui ?? noUi, model(), athlete)).toEqual(expected);
  });
});

describe('buildDataset — CompositeSpec', () => {
  const spec = (components: CompositeSpec['components']): CompositeSpec => ({
    id: 'estimated-total',
    kind: 'composite',
    components,
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
  });
  const lifts = [
    { label: 'squat', include: { all: ['lift:squat'] } },
    { label: 'bench', include: { all: ['lift:bench'] } },
  ];

  it('normalizes variants & uses peak values per component date', () => {
    const m = model({
      baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' },
      variantFactor: { 'squat-chains': { factor: 0.8, n: 5 } },
    });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat-chains', 100, day(1), ['lift:squat', 'addl:chains']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    expect(buildDataset(points, spec(lifts), noUi, m, athlete)).toEqual([
      { t: day(1), 'estimated-total': 300 },
    ]);
  });

  it('excludes non-fitted variantFactor data entries', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat-chains', 999, day(1), ['lift:squat', 'addl:chains']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    expect(buildDataset(points, spec(lifts), noUi, m, athlete)).toEqual([
      { t: day(1), 'estimated-total': 300 },
    ]);
  });

  it('carries forward historical values across missing dates', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat', 220, day(20), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
      pt('bench', 110, day(5), ['lift:bench']),
      pt('bench', 115, day(10), ['lift:bench']),
    ];
    expect(buildDataset(points, spec(lifts), noUi, m, athlete)).toEqual([
      { t: day(1), 'estimated-total': 300 },
      { t: day(5), 'estimated-total': 310 },
      { t: day(10), 'estimated-total': 315 },
      { t: day(20), 'estimated-total': 335 },
    ]);
  });

  it('does not carry forward component values from before the date range', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(5), ['lift:bench']),
      pt('bench', 110, day(10), ['lift:bench']),
      pt('squat', 220, day(20), ['lift:squat']),
    ];
    expect(buildDataset(points, spec(lifts), { dateRange: [day(5), day(31)] }, m, athlete)).toEqual(
      [{ t: day(20), 'estimated-total': 330 }]
    );
  });

  it('blocks row emission until every component reports metrics', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat', 210, day(5), ['lift:squat']),
      pt('bench', 100, day(10), ['lift:bench']),
    ];
    expect(buildDataset(points, spec(lifts), noUi, m, athlete)).toEqual([
      { t: day(10), 'estimated-total': 310 },
    ]);
  });

  it('design C: composite branch does not double-correct when receiving pre-adjusted points (pure factor normalization)', () => {
    // Design C: composite specs receive pre-offset-adjusted points from pipeline.ts.
    // buildDataset's composite branch applies pure factor normalization (no offset term),
    // so the pre-adjusted e1rm points flow through unchanged (aside from factor division).
    const m = model({
      baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' },
      variantFactor: { 'bench-chains': { factor: 1.0, n: 2 } },
      // offset is present in model, but should NOT be applied by normalizeE1rm anymore
      addlWtOffset: { 'bench-chains': { offsetKg: 20, n: 2 } },
    });

    // These points are already pre-adjusted (weight-corrected) from pipeline.ts
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
      // bench-chains point is already offset-adjusted (e.g., derived from 80+20=100kg weight)
      pt('bench-chains', 100, day(1), ['lift:bench', 'addl:chains']),
    ];

    const result = buildDataset(points, spec(lifts), noUi, m, athlete);
    // With pre-adjusted points + pure factor (factor=1.0 for bench-chains), normalized = 100/1 = 100
    // composite = max(200, 100) per bench = 100, total = 200 + 100 = 300
    expect(result).toEqual([{ t: day(1), 'estimated-total': 300 }]);
  });
});
