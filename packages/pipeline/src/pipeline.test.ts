import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from './pipeline';
import type { RawInput } from './parse/parser';
import type { DatasetSpec } from './dataset/build';
import type { AthleteContext } from './derive/athlete';

const FIXTURES_DIR = path.join(__dirname, '../test/fixtures');

const loadFixture = (name: string): RawInput => ({
  name,
  content: fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8'),
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
  {
    id: 'tonnage-per-lift',
    kind: 'series',
    include: {},
    derive: 'tonnage',
  },
  {
    id: 'estimated-total',
    kind: 'composite',
    components: [
      { label: 'squat', include: { any: ['lift:squat'] } },
      { label: 'bench', include: { any: ['lift:bench'] } },
      { label: 'deadlift', include: { any: ['lift:deadlift'] } },
    ],
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
  },
  {
    id: 'wilks-total',
    kind: 'composite',
    components: [
      { label: 'squat', include: { any: ['lift:squat'] } },
      { label: 'bench', include: { any: ['lift:bench'] } },
      { label: 'deadlift', include: { any: ['lift:deadlift'] } },
    ],
    derive: 'e1rm',
    normalize: true,
    combine: 'sum',
    post: 'wilks',
  },
];

const athlete: AthleteContext = { sex: 'M', bodyweight: 90 };

describe('runPipeline (end-to-end)', () => {
  const raw: RawInput[] = FIXTURE_NAMES.map(loadFixture);
  const result = runPipeline(raw, specs, athlete, {});

  it('produces a named dataset for every spec', () => {
    expect(Object.keys(result.datasets).sort()).toEqual(specs.map((s) => s.id).sort());
    for (const spec of specs) {
      expect(Array.isArray(result.datasets[spec.id])).toBe(true);
      for (const row of result.datasets[spec.id]) {
        expect(typeof row.t).toBe('number');
      }
    }
  });

  it('collects a parse error from the malformed freeform fixture without throwing', () => {
    expect(result.parseErrors.length).toBeGreaterThan(0);
    expect(result.parseErrors[0]).toMatchObject({ name: 'ParseError' });
  });

  it('returns a well-shaped diagnostics report', () => {
    expect(Array.isArray(result.diagnostics.variants)).toBe(true);
    expect(Array.isArray(result.diagnostics.weaknesses)).toBe(true);
    expect(Array.isArray(result.diagnostics.unassessed)).toBe(true);
  });

  it('returns arrays for unknown-exercise and unnormalized lists', () => {
    expect(Array.isArray(result.unknownExercises)).toBe(true);
    expect(Array.isArray(result.unnormalized)).toBe(true);
  });

  it('surfaces raw names with no alias entry as unknown exercises', () => {
    const withUnknown = runPipeline(
      [...raw, { name: 'unknown-exercise.txt', content: '2026-01-15 Curls 50x10 @8\n' }],
      specs,
      athlete,
      {}
    );
    expect(withUnknown.unknownExercises).toContain('Curls');
  });

  it('re-runs the full pipeline from scratch on every call (no memoization)', () => {
    const again = runPipeline(raw, specs, athlete, {});
    expect(again.datasets).toEqual(result.datasets);
    expect(again).not.toBe(result);
  });
});
