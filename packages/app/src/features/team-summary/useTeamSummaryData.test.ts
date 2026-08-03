import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { LifterPipelineResult, Point } from '@dyel/api';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { pipelineModelMock, pointStoreMock } from '../../test/helpers/pipelineModelFactory';
import { useTeamSummaryData } from './useTeamSummaryData';

// Fixture factories

const point = (
  t: number,
  v: number,
  series: string = 'squat',
  tags: string[] = ['lift:squat']
): Point => ({
  t,
  v,
  series,
  tags: new Set(tags),
});

const taggedRecord = (
  canonical: string,
  exercise: string = 'Squat',
  overrides?: Partial<TaggedSetRecord>
): TaggedSetRecord => ({
  date: Date.now(),
  exercise,
  weight: 100,
  reps: 1,
  sets: 1,
  rpe: undefined,
  canonical,
  tags: new Set(['lift:squat']),
  effects: [],
  baselineRange: null,
  meta: { rawUnit: 'lbs' },
  ...overrides,
});

// `buildDataset`'s CompositeSpec branch (`@dyel/pipeline`'s `dataset/build.ts`) only includes a
// point in a composite's per-component grid if `normalizeE1rm(point.series, ...)` resolves a
// factor for that series — which requires `point.series` to appear in `model.baseline`'s VALUES
// (see `getFactor` in `derive/normalize.ts`: `Object.values(model.baseline).includes(can) ? 1 :
// ...`). A fixture with an empty baseline silently drops every composite component (squat/bench/
// deadlift/total all resolve to `undefined` per timestamp), so default the baseline to map each
// comp lift to itself unless the caller overrides it.
const DEFAULT_BASELINE = { squat: 'squat', bench: 'bench', deadlift: 'deadlift' };

const minimalPipelineModel = (
  tagged: TaggedSetRecord[] = [],
  e1rmPoints: Point[] = [],
  e1rmMaxEffortPoints: Point[] = [],
  baseline: Record<string, string> = DEFAULT_BASELINE,
  variantFactor: Record<string, { factor: number; n: number }> = {}
) =>
  pipelineModelMock({
    model: { baseline, variantFactor, addlWtOffset: {}, fittedAt: Date.now() },
    tagged,
    points: pointStoreMock(
      new Map([
        ['e1rm', e1rmPoints],
        ['e1rm-max-effort', e1rmMaxEffortPoints],
      ])
    ),
  });

const successResult = (
  name: string,
  model: ReturnType<typeof pipelineModelMock>,
  url: string = 'http://example.com'
): LifterPipelineResult => ({
  status: 'success',
  name,
  url,
  model,
});

const errorResult = (
  name: string,
  url: string = 'http://example.com',
  message: string = 'Parse error'
): LifterPipelineResult => ({
  status: 'error',
  name,
  url,
  message,
});

describe('useTeamSummaryData', () => {
  describe('basic data rendering', () => {
    it('renders a successful lifter with full data', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: 1704067200000 }),
          taggedRecord('bench', 'Bench', { date: 1704067200000 }),
          taggedRecord('deadlift', 'Deadlift', { date: 1704067200000 }),
        ],
        [],
        [
          point(1704067200000, 100, 'squat', ['lift:squat']),
          point(1704067200000, 90, 'bench', ['lift:bench']),
          point(1704067200000, 120, 'deadlift', ['lift:deadlift']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      expect(result.current.rows).toHaveLength(1);
      const row = result.current.rows[0];
      expect(row.lifterName).toBe('Alice');
      expect(row.hasData).toBe(true);
      expect(row.squatDisplay).toBeTruthy();
      expect(row.benchDisplay).toBeTruthy();
      expect(row.deadliftDisplay).toBeTruthy();
      expect(row.totalDisplay).toBeTruthy();
      expect(row.squat).not.toBeNull();
      expect(row.bench).not.toBeNull();
      expect(row.deadlift).not.toBeNull();
      expect(row.total).not.toBeNull();
    });

    it('renders placeholder row for errored lifter', () => {
      const { result } = renderHook(() => useTeamSummaryData([errorResult('Broken')]));

      expect(result.current.rows).toHaveLength(1);
      const row = result.current.rows[0];
      expect(row.lifterName).toBe('Broken');
      expect(row.hasData).toBe(false);
      expect(row.squatDisplay).toBe('—');
      expect(row.benchDisplay).toBe('—');
      expect(row.deadliftDisplay).toBe('—');
      expect(row.totalDisplay).toBe('—');
      expect(row.squat).toBeNull();
      expect(row.bench).toBeNull();
      expect(row.deadlift).toBeNull();
      expect(row.total).toBeNull();
      expect(row.sessionCount).toBe(0);
      expect(row.lastSetDisplay).toBe('—');
      expect(row.dateDisplay).toBe('—');
    });

    it('renders placeholder row for successful lifter with no chart data', () => {
      const model = minimalPipelineModel([], []); // No e1rm points
      const { result } = renderHook(() => useTeamSummaryData([successResult('NoData', model)]));

      expect(result.current.rows).toHaveLength(1);
      const row = result.current.rows[0];
      expect(row.hasData).toBe(false);
      expect(row.squatDisplay).toBe('—');
      expect(row.sessionCount).toBe(0);
    });
  });

  describe('unit detection and display', () => {
    it.each([
      ['kg', { rawUnit: 'kg' }],
      ['lbs', { rawUnit: 'lbs' }],
    ])('detects %s unit from first successful lifter', (expected, meta) => {
      const model = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { meta })],
        [],
        [point(1, 100, 'squat', ['lift:squat'])]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Lifter', model)]));
      expect(result.current.unit).toBe(expected);
    });

    it('falls back to lbs when all results are errors', () => {
      const { result } = renderHook(() =>
        useTeamSummaryData([errorResult('Error1'), errorResult('Error2')])
      );
      expect(result.current.unit).toBe('lbs');
    });

    it.each([
      ['lbs', ['220 lbs', '198 lbs', '265 lbs', '683 lbs'], [220, 198, 265, 683]],
      ['kg', ['100 kg', '90 kg', '120 kg', '310 kg'], [100, 90, 120, 310]],
    ] as const)('formats already-converted chart values once in %s', (unit, displays, values) => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { meta: { rawUnit: unit } }),
          taggedRecord('bench', 'Bench', { meta: { rawUnit: unit } }),
          taggedRecord('deadlift', 'Deadlift', { meta: { rawUnit: unit } }),
        ],
        [],
        [
          point(1, 100, 'squat', ['lift:squat']),
          point(1, 90, 'bench', ['lift:bench']),
          point(1, 120, 'deadlift', ['lift:deadlift']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Lifter', model)]));
      const row = result.current.rows[0];

      expect([row.squatDisplay, row.benchDisplay, row.deadliftDisplay, row.totalDisplay]).toEqual(
        displays
      );
      expect([row.squat, row.bench, row.deadlift, row.total]).toEqual(values);
    });

    it('toggles unit and updates display values', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } })],
        [],
        [point(1, 100, 'squat', ['lift:squat'])]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Lifter', model)]));

      const initialDisplay = result.current.rows[0].squatDisplay;
      expect(result.current.unit).toBe('kg');

      act(() => result.current.toggleUnit());

      expect(result.current.unit).toBe('lbs');
      expect(result.current.rows[0].squatDisplay).not.toBe(initialDisplay);
    });
  });

  describe('date range filtering', () => {
    it('counts sessions only within date range', () => {
      const t1 = new Date('2025-01-01T00:00:00Z').getTime();
      const t2 = new Date('2025-02-01T00:00:00Z').getTime();
      const t3 = new Date('2025-03-01T00:00:00Z').getTime();
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: t1 }),
          taggedRecord('squat', 'Squat', { date: t2 }),
          taggedRecord('squat', 'Squat', { date: t3 }),
        ],
        [],
        [
          point(t1, 100, 'squat', ['lift:squat']),
          point(t2, 105, 'squat', ['lift:squat']),
          point(t3, 110, 'squat', ['lift:squat']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      expect(result.current.rows[0].sessionCount).toBe(3);

      act(() =>
        result.current.setDateRange({
          from: new Date('2025-02-01T00:00:00Z'),
          to: new Date('2025-03-01T23:59:59Z'),
        })
      );

      expect(result.current.rows[0].sessionCount).toBe(2);
    });

    it('includes boundary dates (inclusive)', () => {
      const t1 = new Date('2025-02-01T00:00:00Z').getTime();
      const t2 = new Date('2025-02-15T00:00:00Z').getTime();
      const t3 = new Date('2025-03-01T00:00:00Z').getTime();
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: t1 }),
          taggedRecord('squat', 'Squat', { date: t2 }),
          taggedRecord('squat', 'Squat', { date: t3 }),
        ],
        [],
        [
          point(t1, 100, 'squat', ['lift:squat']),
          point(t2, 105, 'squat', ['lift:squat']),
          point(t3, 110, 'squat', ['lift:squat']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      act(() =>
        result.current.setDateRange({
          from: new Date('2025-02-01T00:00:00Z'),
          to: new Date('2025-03-01T23:59:59Z'),
        })
      );

      expect(result.current.rows[0].sessionCount).toBe(3);
    });

    it('with undefined date range includes all sessions', () => {
      const t1 = new Date('2025-01-01T00:00:00Z').getTime();
      const t2 = new Date('2025-02-01T00:00:00Z').getTime();
      const t3 = new Date('2025-03-01T00:00:00Z').getTime();
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: t1 }),
          taggedRecord('squat', 'Squat', { date: t2 }),
          taggedRecord('squat', 'Squat', { date: t3 }),
        ],
        [],
        [
          point(t1, 100, 'squat', ['lift:squat']),
          point(t2, 105, 'squat', ['lift:squat']),
          point(t3, 110, 'squat', ['lift:squat']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      expect(result.current.dateRange.from).toBeUndefined();
      expect(result.current.dateRange.to).toBeUndefined();
      expect(result.current.rows[0].sessionCount).toBe(3);
    });

    it('counts distinct session timestamps', () => {
      const date1 = 1000000000;
      const date2 = date1 + 12 * 60 * 60 * 1000; // 12 hours later
      const date3 = date1 + 24 * 60 * 60 * 1000; // 24 hours later
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: date1 }),
          taggedRecord('squat', 'Squat', { date: date2 }),
          taggedRecord('squat', 'Squat', { date: date3 }),
        ],
        [],
        [
          point(date1, 100, 'squat', ['lift:squat']),
          point(date2, 102, 'squat', ['lift:squat']),
          point(date3, 105, 'squat', ['lift:squat']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      // Three distinct timestamps = 3 sessions
      expect(result.current.rows[0].sessionCount).toBe(3);
    });
  });

  describe('multi-lifter scenarios', () => {
    it('renders all lifters in results including mixed success/error', () => {
      const m1 = minimalPipelineModel(
        [taggedRecord('squat', 'Squat')],
        [],
        [point(1, 100, 'squat', ['lift:squat'])]
      );
      const m2 = minimalPipelineModel(
        [taggedRecord('bench', 'Bench')],
        [],
        [point(1, 90, 'bench', ['lift:bench'])]
      );

      const { result } = renderHook(() =>
        useTeamSummaryData([
          successResult('Alice', m1),
          errorResult('Broken'),
          successResult('Bob', m2),
        ])
      );

      expect(result.current.rows).toHaveLength(3);
      expect(result.current.rows[0].lifterName).toBe('Alice');
      expect(result.current.rows[1].lifterName).toBe('Broken');
      expect(result.current.rows[2].lifterName).toBe('Bob');
      expect(result.current.rows[0].hasData).toBe(true);
      expect(result.current.rows[1].hasData).toBe(false);
      expect(result.current.rows[2].hasData).toBe(true);
    });

    it('counts errors correctly', () => {
      const { result } = renderHook(() =>
        useTeamSummaryData([
          successResult('L1', minimalPipelineModel()),
          errorResult('E1'),
          successResult('L2', minimalPipelineModel()),
          errorResult('E2'),
        ])
      );

      expect(result.current.erroredLifterCount).toBe(2);
    });
  });

  describe('numeric fields for sorting', () => {
    it('populates numeric squat/bench/deadlift/total fields alongside display strings', () => {
      // meta.rawUnit: 'kg' keeps the raw fixture point values (already in kg internally, per the
      // pipeline's kg-internal invariant) equal to the displayed/sorted numbers below — avoids
      // conflating this test's assertions with the separate kg->lbs conversion covered by the
      // "unit detection and display" tests above.
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } }),
          taggedRecord('bench', 'Bench', { meta: { rawUnit: 'kg' } }),
          taggedRecord('deadlift', 'Deadlift', { meta: { rawUnit: 'kg' } }),
        ],
        [],
        [
          point(1, 100, 'squat', ['lift:squat']),
          point(1, 90, 'bench', ['lift:bench']),
          point(1, 120, 'deadlift', ['lift:deadlift']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      const row = result.current.rows[0];
      expect(row.squat).toBe(100);
      expect(row.bench).toBe(90);
      expect(row.deadlift).toBe(120);
      expect(row.total).toBe(310);
      expect(typeof row.squatDisplay).toBe('string');
      expect(typeof row.benchDisplay).toBe('string');
      expect(typeof row.deadliftDisplay).toBe('string');
      expect(typeof row.totalDisplay).toBe('string');
    });

    it('sets numeric fields to null when values are undefined', () => {
      const model = minimalPipelineModel(
        [taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } })],
        [],
        [point(1, 100, 'squat', ['lift:squat'])]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      const row = result.current.rows[0];
      expect(row.squat).toBe(100);
      expect(row.bench).toBeNull();
      expect(row.deadlift).toBeNull();
      expect(row.benchDisplay).toBe('—');
      expect(row.deadliftDisplay).toBe('—');
    });
  });

  describe('last session details', () => {
    it('populates dateDisplay and lastSetDisplay from most recent session', () => {
      const model = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', {
            date: 1704067200000,
            weight: 245,
            reps: 3,
            sets: 1,
          }),
          taggedRecord('bench', 'Bench', {
            date: 1704067200000,
            weight: 185,
            reps: 5,
            sets: 1,
          }),
        ],
        [],
        [
          point(1704067200000, 100, 'squat', ['lift:squat']),
          point(1704067200000, 90, 'bench', ['lift:bench']),
        ]
      );
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      const row = result.current.rows[0];
      expect(row.dateDisplay).toBeTruthy();
      expect(row.dateDisplay).not.toBe('—');
      expect(row.lastSetDisplay).toBeTruthy();
      expect(row.lastSetDisplay).not.toBe('—');
    });

    it('uses dashes when no session detail available', () => {
      const model = minimalPipelineModel([], [], [point(1, 100, 'squat', ['lift:squat'])]);
      const { result } = renderHook(() => useTeamSummaryData([successResult('Alice', model)]));

      const row = result.current.rows[0];
      expect(row.dateDisplay).toBe('—');
      expect(row.lastSetDisplay).toBe('—');
    });
  });

  describe('url preservation', () => {
    it('preserves lifter url for both successful and error results', () => {
      const url1 = 'https://example.com/sheet1';
      const url2 = 'https://example.com/sheet2';
      const url3 = 'https://example.com/sheet3';

      const { result } = renderHook(() =>
        useTeamSummaryData([
          successResult(
            'Alice',
            minimalPipelineModel([], [], [point(1, 100, 'squat', ['lift:squat'])]),
            url1
          ),
          errorResult('Broken', url2),
          successResult('Bob', minimalPipelineModel(), url3),
        ])
      );

      expect(result.current.rows[0].url).toBe(url1);
      expect(result.current.rows[1].url).toBe(url2);
      expect(result.current.rows[2].url).toBe(url3);
    });
  });

  describe('state management', () => {
    it('maintains dateRange state independently', () => {
      const { result } = renderHook(() => useTeamSummaryData([]));

      expect(result.current.dateRange.from).toBeUndefined();
      expect(result.current.dateRange.to).toBeUndefined();

      act(() =>
        result.current.setDateRange({
          from: new Date('2025-01-01'),
          to: new Date('2025-12-31'),
        })
      );

      expect(result.current.dateRange.from).toBeDefined();
      expect(result.current.dateRange.to).toBeDefined();
    });

    it('maintains unit state independently', () => {
      const { result } = renderHook(() =>
        useTeamSummaryData([
          successResult(
            'Alice',
            minimalPipelineModel(
              [taggedRecord('squat', 'Squat', { meta: { rawUnit: 'kg' } })],
              [],
              [point(1, 100, 'squat', ['lift:squat'])]
            )
          ),
        ])
      );

      expect(result.current.unit).toBe('kg');

      act(() => result.current.setUnit('lbs'));
      expect(result.current.unit).toBe('lbs');

      act(() => result.current.toggleUnit());
      expect(result.current.unit).toBe('kg');
    });
  });

  describe('integration: full workflow', () => {
    it('handles a typical coach team view scenario', () => {
      const date1 = new Date('2025-01-15T00:00:00Z').getTime();
      const date2 = new Date('2025-02-01T00:00:00Z').getTime();

      const m1 = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: date1, meta: { rawUnit: 'kg' } }),
          taggedRecord('bench', 'Bench', { date: date1, meta: { rawUnit: 'kg' } }),
          taggedRecord('deadlift', 'Deadlift', { date: date2, meta: { rawUnit: 'kg' } }),
        ],
        [],
        [
          point(date1, 140, 'squat', ['lift:squat']),
          point(date1, 100, 'bench', ['lift:bench']),
          point(date2, 180, 'deadlift', ['lift:deadlift']),
        ]
      );

      const m2 = minimalPipelineModel(
        [
          taggedRecord('squat', 'Squat', { date: date1, meta: { rawUnit: 'lbs' } }),
          taggedRecord('bench', 'Bench', { date: date2, meta: { rawUnit: 'lbs' } }),
        ],
        [],
        [point(date1, 300, 'squat', ['lift:squat']), point(date2, 250, 'bench', ['lift:bench'])]
      );

      const { result } = renderHook(() =>
        useTeamSummaryData([successResult('Alice', m1), successResult('Bob', m2)])
      );

      expect(result.current.unit).toBe('kg');
      expect(result.current.rows).toHaveLength(2);

      const alice = result.current.rows[0];
      expect(alice.lifterName).toBe('Alice');
      expect(alice.hasData).toBe(true);
      expect(alice.squat).toBe(140);
      expect(alice.sessionCount).toBe(2);

      const bob = result.current.rows[1];
      expect(bob.lifterName).toBe('Bob');
      expect(bob.hasData).toBe(true);

      // Toggle unit
      act(() => result.current.toggleUnit());
      expect(result.current.unit).toBe('lbs');
      expect(result.current.rows[0].squatDisplay).not.toBe(alice.squatDisplay);

      // Set date range
      act(() =>
        result.current.setDateRange({
          from: new Date('2025-02-01T00:00:00Z'),
          to: new Date('2025-02-28T00:00:00Z'),
        })
      );

      const aliceFiltered = result.current.rows[0];
      expect(aliceFiltered.sessionCount).toBe(1); // Only the Feb 1 deadlift
    });
  });
});
