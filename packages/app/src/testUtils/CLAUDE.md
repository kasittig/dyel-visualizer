# testUtils

Reusable test helpers shared across `packages/app` test suites (not app runtime code).

| File                         | Purpose                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compareChartSeries.ts`      | Extracts a single named series from `ChartPoint[]` and computes `{ count, values, min, max, range, ratio }` for assertion composition                                                                |
| `compareChartSeries.test.ts` | `it.each` matrix covering empty/missing/single/multi-value/undefined-filtering cases                                                                                                                 |
| `diffChartSeries.ts`         | Joins two independently-produced `ChartPoint[]` arrays by local calendar date, then diffs a named series to produce `SeriesDiff` statistics (comparedCount, gaps, max absolute/relative differences) |
| `diffChartSeries.test.ts`    | `it.each` matrix covering empty/join-mismatch/date-format-normalization/single-multi-point/gap/divergence cases                                                                                      |
| `diffVariationSnapshot.ts`   | Reduces pipeline's per-variation time series to last-value-per-variation snapshot; diffs against legacy `normalizeToBaseE1RM` snapshot logic                                                         |

## Core-vs-pipeline parity test harness

`compareChartSeries` exists to keep parity tests (e.g. `packages/app/src/pipeline/totalChartParity.test.ts`) flat and free of copy-pasted filter/min/max boilerplate per series. Pattern:

1. Load a real, committed CSV fixture (see `packages/app/test/fixtures/CLAUDE.md`) at module scope in `beforeAll`.
2. Run it through `runPipeline` with the real `DatasetSpec[]` used in production (never a bespoke test-only spec).
3. Merge the result into `ChartPoint[]` via `mergeRechartsRowsToChartPoints`/`mergeWideRechartsRows` (`utils/pipelineChartUtils.ts`) — the same merge the app uses.
4. For each series that must be pixel-for-pixel trustworthy, use `it.each` over the series names and assert on `compareChartSeries(pipelineOutput, seriesName)` (`count > 0`, per-value sanity bounds, `range`/`ratio` bounds).
5. For a series with a known divergence from the legacy `@dyel/core` implementation, write a "soft warn" test: `console.warn` on suspicious values instead of failing, but still assert the series is non-empty. This pattern is used for interim tracking while a series is pending root-cause and fix, with the expectation that the soft-warn will be promoted to a hard assertion once the divergence is resolved (this already happened for bench/pushPull/total after the board/block/deficit equipment-magnitude fix in commit `dd01c17`, and earlier for bench identity itself).

To add a new parity test for another chart, copy this shape — do not hand-roll new min/max/filter logic; extend `compareChartSeries` instead if a new statistic is needed.

## Core-vs-pipeline live diff harness

`diffChartSeries` complements `compareChartSeries` for a different use case: **directly comparing two independently-computed `ChartPoint[]` arrays** (e.g. a legacy `@dyel/core` implementation and a `@dyel/pipeline` implementation, both run over the same input fixture) to catch behavioral divergence between them.

**When to use which:**

- `compareChartSeries` — single-array sanity check: given a pipelined `ChartPoint[]` output, extract one series and assert its summary stats are sensible (non-empty, within bounds, sane min/max/range).
- `diffChartSeries` — two-array behavioral comparison: given a legacy output and a pipeline output over the same fixture, join them and assert the two implementations produce the same values (or track and document divergence pending root-cause).

**Date normalization (why the join step is necessary):**

`ChartPoint.date` can be formatted differently between sources (e.g. a local date string `"2026-01-15"` vs. a UTC ISO instant `"2026-01-15T12:30:45.000Z"`). `joinChartPointsByDate` normalizes both to local `YYYY-MM-DD` keys before pairing, so you can diffuse series values directly without false mismatches from date format alone. When multiple points from one source map to the same local date, the last one wins.

**Usage pattern:**

1. Run both implementations (legacy and pipeline) over the same fixture in `beforeAll` and convert each result to `ChartPoint[]`.
2. Call `joinChartPointsByDate(legacyOutput, pipelineOutput)` once.
3. For each series of interest, call `diffSeries(joined, seriesName)` to get a `SeriesDiff`.
4. Assert on the result:
   - For a series expected to match exactly: `expect(diff.maxAbsDiff).toBe(0)` and `expect(diff.comparedCount).toBeGreaterThan(0)`.
   - For a series with a known divergence pending root-cause: `expect(diff.maxRelDiff).toBeLessThan(0.05)` (5% tolerance) and soft-warn if exceeded (e.g. `if (diff.maxRelDiff > 0.05) console.warn(...)`). This tolerance-with-warn pattern exists to track an as-yet-unfixed gap toward eventual parity, not as a permanent tolerance band; the series should be traceable to an open tracking issue and promoted to hard-assert once fixed.
   - For a series that should exist in both implementations: `expect(diff.missingInA + diff.missingInB).toBe(0)` or allow it to be zero only if both are zero (i.e., no silent dropped series).
