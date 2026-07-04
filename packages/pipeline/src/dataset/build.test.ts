import { describe, it, expect } from 'vitest';
import { buildDataset } from './build';
import type { SeriesSpec, CompositeSpec, RenderParams } from './build';
import type { Point } from '../types';
import type { NormalizationModel } from '../derive/normalize';
import type { AthleteContext } from '../derive/athlete';
import { wilks, dots } from '../derive/athlete';

const day = (n: number) => Date.UTC(2024, 0, n);

const pt = (series: string, v: number, t: number, tags: string[] = []): Point => ({
  t,
  v,
  series,
  tags: new Set(tags),
});

const model = (overrides?: Partial<NormalizationModel>): NormalizationModel => ({
  fittedAt: 0,
  baseline: {},
  variantFactor: {},
  addlWtOffset: {},
  ...overrides,
});

const athlete: AthleteContext = { sex: 'M', bodyweight: 83 };
const noUi: RenderParams = {};

describe('buildDataset — SeriesSpec', () => {
  const spec = (include: SeriesSpec['include']): SeriesSpec => ({
    id: 'e1rm-per-lift',
    kind: 'series',
    include,
    derive: 'e1rm',
  });

  it('pivots matching points by canonical into columns, one row per date', () => {
    const points = [
      pt('bench', 100, day(1), ['lift:bench']),
      pt('ohp', 50, day(1), ['lift:ohp']),
      pt('bench', 105, day(2), ['lift:bench']),
    ];
    const rows = buildDataset(points, spec({}), noUi, model(), athlete);
    expect(rows).toEqual([
      { t: day(1), bench: 100, ohp: 50 },
      { t: day(2), bench: 105 },
    ]);
  });

  it('filters by include.all (AND)', () => {
    const points = [
      pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    const rows = buildDataset(
      points,
      spec({ all: ['lift:bench', 'addl:chains'] }),
      noUi,
      model(),
      athlete
    );
    expect(rows).toEqual([{ t: day(1), 'bench-chains': 90 }]);
  });

  it('filters by include.any (OR)', () => {
    const points = [
      pt('bench', 100, day(1), ['lift:bench']),
      pt('squat', 200, day(1), ['lift:squat']),
    ];
    const rows = buildDataset(points, spec({ any: ['lift:bench'] }), noUi, model(), athlete);
    expect(rows).toEqual([{ t: day(1), bench: 100 }]);
  });

  it('filters by include.none (exclusion)', () => {
    const points = [
      pt('bench', 100, day(1), ['lift:bench']),
      pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
    ];
    const rows = buildDataset(
      points,
      spec({ all: ['lift:bench'], none: ['addl:chains'] }),
      noUi,
      model(),
      athlete
    );
    expect(rows).toEqual([{ t: day(1), bench: 100 }]);
  });

  it('matches on the canonical id itself, not just tags', () => {
    const points = [pt('bench', 100, day(1), [])];
    const rows = buildDataset(points, spec({ any: ['bench'] }), noUi, model(), athlete);
    expect(rows).toEqual([{ t: day(1), bench: 100 }]);
  });

  it.each([
    {
      name: 'chips.include narrows further',
      points: [
        pt('bench', 100, day(1), ['lift:bench']),
        pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
      ],
      include: { all: ['lift:bench'] } as SeriesSpec['include'],
      chips: { include: ['addl:chains'], exclude: [] },
      expected: [{ t: day(1), 'bench-chains': 90 }],
    },
    {
      name: 'chips.exclude removes a point spec.include alone would allow',
      points: [
        pt('bench', 100, day(1), ['lift:bench']),
        pt('bench-chains', 90, day(1), ['lift:bench', 'addl:chains']),
      ],
      include: { all: ['lift:bench'] } as SeriesSpec['include'],
      chips: { include: [], exclude: ['addl:chains'] },
      expected: [{ t: day(1), bench: 100 }],
    },
    {
      name: 'chips present with empty arrays is a no-op',
      points: [pt('bench', 100, day(1), ['lift:bench'])],
      include: { all: ['lift:bench'] } as SeriesSpec['include'],
      chips: { include: [], exclude: [] },
      expected: [{ t: day(1), bench: 100 }],
    },
    {
      name: 'undefined chips leaves spec.include unchanged',
      points: [pt('bench', 100, day(1), ['lift:bench'])],
      include: { all: ['lift:bench'] } as SeriesSpec['include'],
      chips: undefined,
      expected: [{ t: day(1), bench: 100 }],
    },
    {
      name: 'spec.include.any is preserved alongside a chip merge',
      points: [pt('bench', 100, day(1), ['lift:bench']), pt('squat', 200, day(1), ['lift:squat'])],
      include: { any: ['lift:bench', 'lift:squat'] } as SeriesSpec['include'],
      chips: { include: [], exclude: ['lift:squat'] },
      expected: [{ t: day(1), bench: 100 }],
    },
  ])('$name', ({ points, include, chips, expected }) => {
    const rows = buildDataset(points, spec(include), { chips }, model(), athlete);
    expect(rows).toEqual(expected);
  });

  it('returns [] for empty input', () => {
    expect(buildDataset([], spec({}), noUi, model(), athlete)).toEqual([]);
  });

  it('returns [] when nothing matches', () => {
    const points = [pt('bench', 100, day(1), ['lift:bench'])];
    const rows = buildDataset(points, spec({ all: ['lift:squat'] }), noUi, model(), athlete);
    expect(rows).toEqual([]);
  });
});

describe('buildDataset — CompositeSpec', () => {
  const spec = (
    components: CompositeSpec['components'],
    post?: CompositeSpec['post']
  ): CompositeSpec => ({
    id: 'estimated-total',
    kind: 'composite',
    components,
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
    post,
  });

  const twoLiftComponents: CompositeSpec['components'] = [
    { label: 'squat', include: { all: ['lift:squat'] } },
    { label: 'bench', include: { all: ['lift:bench'] } },
  ];

  it('normalizes variants, takes max-per-date across variants in one component', () => {
    const m = model({
      baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' },
      variantFactor: { 'squat-chains': { factor: 0.8, n: 5 } },
    });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat-chains', 100, day(1), ['lift:squat', 'addl:chains']), // normalized: 100/0.8 = 125
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    const rows = buildDataset(points, spec(twoLiftComponents), noUi, m, athlete);
    expect(rows).toEqual([{ t: day(1), 'estimated-total': 200 + 100 }]);
  });

  it('excludes points with no fitted variantFactor (not zero-fill)', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat-chains', 999, day(1), ['lift:squat', 'addl:chains']), // unfitted, must be excluded
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    const rows = buildDataset(points, spec(twoLiftComponents), noUi, m, athlete);
    expect(rows).toEqual([{ t: day(1), 'estimated-total': 300 }]);
  });

  it('carries the most recent value forward across gaps', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat', 220, day(20), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
      pt('bench', 110, day(5), ['lift:bench']),
      pt('bench', 115, day(10), ['lift:bench']),
    ];
    const rows = buildDataset(points, spec(twoLiftComponents), noUi, m, athlete);
    expect(rows).toEqual([
      { t: day(1), 'estimated-total': 300 },
      { t: day(5), 'estimated-total': 310 },
      { t: day(10), 'estimated-total': 315 },
      { t: day(20), 'estimated-total': 335 }, // squat 220 + bench carried from day 10 (115)
    ]);
  });

  it('gates: no row until every component has reported at least once', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat', 210, day(5), ['lift:squat']),
      pt('bench', 100, day(10), ['lift:bench']), // bench first reports on day 10
    ];
    const rows = buildDataset(points, spec(twoLiftComponents), noUi, m, athlete);
    expect(rows).toEqual([{ t: day(10), 'estimated-total': 310 }]);
  });

  it('gates permanently when a component never appears at all', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('squat', 210, day(5), ['lift:squat']),
    ];
    const rows = buildDataset(points, spec(twoLiftComponents), noUi, m, athlete);
    expect(rows).toEqual([]);
  });

  it('sums 3 components once the gate opens', () => {
    const m = model({
      baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench', 'lift:deadlift': 'deadlift' },
    });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
      pt('deadlift', 250, day(1), ['lift:deadlift']),
    ];
    const threeComponents: CompositeSpec['components'] = [
      ...twoLiftComponents,
      { label: 'deadlift', include: { all: ['lift:deadlift'] } },
    ];
    const rows = buildDataset(points, spec(threeComponents), noUi, m, athlete);
    expect(rows[0]['estimated-total']).toBeCloseTo(550);
  });

  it('applies wilks post-transform to the summed total', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    const rows = buildDataset(points, spec(twoLiftComponents, 'wilks'), noUi, m, athlete);
    expect(rows[0]['estimated-total']).toBeCloseTo(wilks(300, athlete));
  });

  it('applies dots post-transform to the summed total', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    const rows = buildDataset(points, spec(twoLiftComponents, 'dots'), noUi, m, athlete);
    expect(rows[0]['estimated-total']).toBeCloseTo(dots(300, athlete));
  });

  it('emits the raw sum unchanged when post is absent', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench']),
    ];
    const rows = buildDataset(points, spec(twoLiftComponents), noUi, m, athlete);
    expect(rows[0]['estimated-total']).toBe(300);
  });

  it('chip merge changes whether the gate opens', () => {
    const m = model({ baseline: { 'lift:squat': 'squat', 'lift:bench': 'bench' } });
    const points = [
      pt('squat', 200, day(1), ['lift:squat']),
      pt('bench', 100, day(1), ['lift:bench', 'addl:chains']),
    ];
    const rows = buildDataset(
      points,
      spec(twoLiftComponents),
      { chips: { include: [], exclude: ['addl:chains'] } },
      m,
      athlete
    );
    expect(rows).toEqual([]);
  });

  it('returns [] for empty input', () => {
    expect(buildDataset([], spec(twoLiftComponents), noUi, model(), athlete)).toEqual([]);
  });
});

describe('buildDataset — dateRange clipping', () => {
  const seriesSpec: SeriesSpec = { id: 's', kind: 'series', include: {}, derive: 'e1rm' };

  it('clips rows to the inclusive [start, end] bound', () => {
    const points = [
      pt('bench', 100, day(1), []),
      pt('bench', 105, day(5), []),
      pt('bench', 110, day(10), []),
    ];
    const rows = buildDataset(
      points,
      seriesSpec,
      { dateRange: [day(1), day(5)] },
      model(),
      athlete
    );
    expect(rows).toEqual([
      { t: day(1), bench: 100 },
      { t: day(5), bench: 105 },
    ]);
  });

  it('passes all rows through when dateRange is unset', () => {
    const points = [pt('bench', 100, day(1), []), pt('bench', 110, day(10), [])];
    const rows = buildDataset(points, seriesSpec, noUi, model(), athlete);
    expect(rows).toHaveLength(2);
  });
});

describe('buildDataset — purity', () => {
  it('is a pure recompute: identical-shaped fresh inputs produce equal output', () => {
    const spec: SeriesSpec = {
      id: 's',
      kind: 'series',
      include: { all: ['lift:bench'] },
      derive: 'e1rm',
    };
    const build = () => [pt('bench', 100, day(1), ['lift:bench'])];
    const a = buildDataset(
      build(),
      spec,
      { chips: { include: [], exclude: [] } },
      model(),
      athlete
    );
    const b = buildDataset(
      build(),
      spec,
      { chips: { include: [], exclude: [] } },
      model(),
      athlete
    );
    expect(a).toEqual(b);
  });
});
