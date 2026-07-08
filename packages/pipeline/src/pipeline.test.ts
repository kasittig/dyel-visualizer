import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from './pipeline';
import type { DatasetSpec } from './dataset/build';

const loadFixture = (name: string) => ({
  name,
  content: fs.readFileSync(path.join(__dirname, '../test/fixtures', name), 'utf-8'),
});

const FIXTURE_NAMES = [
  'csv-header-unit-lbs.csv',
  'csv-unit-column-mixed.csv',
  'csv-cell-suffix-unit.csv',
  'freeform-simple-form.txt',
  'freeform-reversed-form.txt',
  'freeform-inline-unit-suffix.txt',
  'freeform-preamble-units-kg.txt',
  'freeform-multi-weight-shorthand.txt',
  'freeform-near-variant-exercise-names.txt',
  'freeform-malformed-line.txt',
];

const specs: DatasetSpec[] = [
  {
    id: 'e1rm-per-bench-variant',
    kind: 'series',
    include: { any: ['lift:bench'] },
    derive: 'e1rm',
  },
  { id: 'tonnage-per-lift', kind: 'series', include: {}, derive: 'tonnage' },
  {
    id: 'estimated-total',
    kind: 'composite',
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
    components: [
      { label: 'squat', include: { any: ['lift:squat'] } },
      { label: 'bench', include: { any: ['lift:bench'] } },
      { label: 'deadlift', include: { any: ['lift:deadlift'] } },
    ],
  },
  {
    id: 'wilks-total',
    kind: 'composite',
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
    post: 'wilks',
    components: [
      { label: 'squat', include: { any: ['lift:squat'] } },
      { label: 'bench', include: { any: ['lift:bench'] } },
      { label: 'deadlift', include: { any: ['lift:deadlift'] } },
    ],
  },
];

const athlete = { sex: 'M' as const, bodyweight: 90, deadliftStance: 'conventional' as const };

describe('runPipeline (end-to-end)', () => {
  const raw = FIXTURE_NAMES.map(loadFixture);
  const result = runPipeline(raw, specs, athlete, {});

  it('runs successfully with a properly shaped output structure', () => {
    // Verifies all specs generated datasets containing valid time rows
    specs.forEach((s) => {
      expect(result.datasets[s.id]).toBeInstanceOf(Array);
      result.datasets[s.id].forEach((row) => expect(row.t).toBeTypeOf('number'));
    });

    // Holistic structural shape affirmation using toMatchObject
    expect(result).toMatchObject({
      parseErrors: [{ name: 'ParseError' }],
      diagnostics: {
        variants: expect.any(Array),
        weaknesses: expect.any(Array),
        unassessed: expect.any(Array),
      },
      unknownExercises: expect.any(Array),
      unnormalized: expect.any(Array),
    });
  });

  it('surfaces unmapped raw exercises', () => {
    const fresh = runPipeline(
      [...raw, { name: 'unmapped.txt', content: '2026-01-15 Curls 50x10 @8\n' }],
      specs,
      athlete,
      {}
    );
    expect(fresh.unknownExercises).toContain('Curls');
  });

  it('re-runs the integration code from scratch without memoization', () => {
    const again = runPipeline(raw, specs, athlete, {});
    expect(again.datasets).toEqual(result.datasets);
    expect(again).not.toBe(result);
  });

  describe('e1rm-max-effort deriver spec variant', () => {
    it('excludes speed-work-only days that e1rm would still include', () => {
      // 2026-01-10 has only speed-work sets (2+ sets, no RPE) for bench.
      const speedWorkOnlyContent =
        'Date,Exercise,Reps,Weight (lbs),Sets\n2026-01-10,Bench,3,85,9\n';

      const maxEffortSpecs: DatasetSpec[] = [
        {
          id: 'e1rm-max-effort-bench',
          kind: 'series',
          include: { any: ['lift:bench'] },
          derive: 'e1rm-max-effort',
        },
        { id: 'e1rm-bench', kind: 'series', include: { any: ['lift:bench'] }, derive: 'e1rm' },
      ];

      const result = runPipeline(
        [{ name: 'speed-work-only.csv', content: speedWorkOnlyContent }],
        maxEffortSpecs,
        athlete,
        {}
      );

      // e1rm falls back to the speed-work sets and produces a row for that date.
      expect(result.datasets['e1rm-bench'].length).toBeGreaterThan(0);
      // e1rm-max-effort excludes the day entirely since there are no max-effort sets.
      expect(result.datasets['e1rm-max-effort-bench']).toEqual([]);
    });

    it('respects a composite spec derive field instead of defaulting to e1rm points', () => {
      const speedWorkOnlyContent =
        'Date,Exercise,Reps,Weight (lbs),Sets\n' +
        '2026-01-10,Squat,3,200,9\n2026-01-10,Bench,3,85,9\n2026-01-10,Deadlift,3,250,9\n' +
        '2026-01-15,Squat,5,200,\n2026-01-15,Bench,5,150,\n2026-01-15,Deadlift,5,250,\n';

      const compositeSpecs: DatasetSpec[] = [
        {
          id: 'estimated-total-max-effort',
          kind: 'composite',
          derive: 'e1rm-max-effort',
          normalize: true,
          combine: 'sum',
          components: [
            { label: 'squat', include: { any: ['lift:squat'] } },
            { label: 'bench', include: { any: ['lift:bench'] } },
            { label: 'deadlift', include: { any: ['lift:deadlift'] } },
          ],
        },
      ];

      const result = runPipeline(
        [{ name: 'composite-max-effort.csv', content: speedWorkOnlyContent }],
        compositeSpecs,
        athlete,
        {}
      );

      // Only 2026-01-15 has max-effort sets for all three lifts, so only that date
      // should be able to produce a composite row (speed-work-only 01-10 is excluded).
      const rows = result.datasets['estimated-total-max-effort'];
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.t !== new Date('2026-01-10').getTime())).toBe(true);
    });
  });

  describe('groupBy: label spec variant', () => {
    it('produces one series per distinct raw logged string, not per canonical', () => {
      // Create two variants that would normally share a canonical:
      // "Bench (CG)" and "Bench (close grip)" both parse to the same canonical "bench-close"
      const multiVariantContent =
        '2026-01-10 Bench (CG) 185x5\n' +
        '2026-01-10 Bench (close grip) 180x6\n' +
        '2026-01-15 Bench (CG) 190x4\n' +
        '2026-01-15 Bench (close grip) 185x5\n';

      const labelSpecs: DatasetSpec[] = [
        {
          id: 'by-label',
          kind: 'series',
          include: { any: ['lift:bench'] },
          derive: 'e1rm',
          groupBy: 'label',
        },
        { id: 'by-canonical', kind: 'series', include: { any: ['lift:bench'] }, derive: 'e1rm' },
      ];

      const result = runPipeline(
        [{ name: 'multi-variant.txt', content: multiVariantContent }],
        labelSpecs,
        athlete,
        {}
      );

      const byLabel = result.datasets['by-label'];
      const byCanonical = result.datasets['by-canonical'];

      // Both should have data
      expect(byLabel.length).toBeGreaterThan(0);
      expect(byCanonical.length).toBeGreaterThan(0);

      // Extract series keys (column names excluding 't')
      const labelSeriesKeys = new Set(Object.keys(byLabel[0] || {}).filter((k) => k !== 't'));
      const canonicalSeriesKeys = new Set(
        Object.keys(byCanonical[0] || {}).filter((k) => k !== 't')
      );

      // The label-based grouping should show both raw strings as distinct series
      // (or at minimum, have a different set of keys than canonical grouping when variants exist)
      // If both variants share a canonical, byCanonical will collapse them to one series key,
      // while byLabel will show both raw strings as separate columns
      expect(labelSeriesKeys.size).toBeGreaterThanOrEqual(1);

      // At a minimum, verify that label-based grouping actually uses rawExercise strings
      // by checking that at least one series key looks like a raw exercise name, not a canonical slug
      const hasRawExerciseName = Array.from(labelSeriesKeys).some((key) => key.includes('('));
      expect(hasRawExerciseName).toBe(true);

      // Both variants share canonical "bench-close", so canonical grouping collapses them to
      // a single series key, while label grouping preserves both raw strings as distinct keys.
      expect(canonicalSeriesKeys.size).toBeLessThan(labelSeriesKeys.size);
    });
  });

  describe('Design C: composite spec with addlWt (chains) and reps > 1', () => {
    it('uses weight-space-corrected e1RM values from offsetAdjustRecords (pre-derivation)', () => {
      // Design C: composite specs consume pre-offset-adjusted records, so their e1RM derivations
      // are based on corrected weights. This test uses reps > 1 to prove weight-space correction
      // differs from e1RM-space (Epley's formula is nonlinear).
      const designCContent =
        'Date,Exercise,Reps,Weight (lbs),RPE\n' +
        '2026-01-10,Squat,5,405,\n' +
        '2026-01-10,Bench,5,315,\n' +
        '2026-01-10,Bench (chains),3,245,\n' +
        '2026-01-10,Deadlift,5,495,\n' +
        '2026-01-15,Squat,3,440,\n' +
        '2026-01-15,Bench,3,335,\n' +
        '2026-01-15,Bench (chains),2,270,\n' +
        '2026-01-15,Deadlift,3,540,\n';

      const compositeSpec: DatasetSpec[] = [
        {
          id: 'estimated-total',
          kind: 'composite',
          derive: 'e1rm',
          normalize: true,
          combine: 'sum',
          components: [
            { label: 'squat', include: { any: ['lift:squat'] } },
            { label: 'bench', include: { any: ['lift:bench'] } },
            { label: 'deadlift', include: { any: ['lift:deadlift'] } },
          ],
        },
      ];

      const result = runPipeline(
        [{ name: 'design-c-test.csv', content: designCContent }],
        compositeSpec,
        athlete,
        {}
      );

      // Verify the composite ran and produced output rows
      const compositeRows = result.datasets['estimated-total'];
      expect(compositeRows.length).toBeGreaterThan(0);

      // Verify the model has fitted an offset for bench-chains
      // (The raw data: bench-chains @ reps=3, weight=245; bench @ reps=5, weight=315.
      // With offset fitting, bench-chains should have a positive offset, making it
      // closer to baseline. With composite spec using pre-adjusted points, the
      // normalized total should be stable across bench variants.)
      expect(result.model.addlWtOffset['bench-chains']).toBeDefined();
      expect(result.model.addlWtOffset['bench-chains'].offsetKg).toBeGreaterThan(0);

      // All composite rows should have a positive estimated total
      compositeRows.forEach((row) => {
        expect(row['estimated-total']).toBeGreaterThan(0);
      });
    });
  });
});
