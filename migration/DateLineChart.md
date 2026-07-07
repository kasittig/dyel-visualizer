# Migrate DateLineChart to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `DateLineChart` off `@dyel/core` and add an analogous validation test.

## Context

`DateLineChart.tsx` is the shared shell used by the time-series line charts (date-indexed
X axis, unit-suffixed Y axis); it only depends on `@dyel/core` for `formatDate` (axis-tick
formatter) and the `ChartPoint` type. Like `SessionBarChart`, it has no aggregation logic
of its own — callers supply the data and the `<Line>`/`<Tooltip>` children — so this is
primarily a boundary-import cleanup rather than a data-parity concern.

## Plan

1. Depend on the `ChartPoint` re-export from `@dyel/pipeline` and the relocated
   `formatDate` utility (see `migration/SessionBarChart.md` — same underlying cleanup,
   do it once and update both call sites).
2. Update `DateLineChart.tsx`'s imports accordingly; confirm no remaining `@dyel/core`
   references.
3. Add `packages/app/src/pipeline/dateLineChartParity.test.ts`: since `DateLineChart` is a
   shared shell with no aggregation logic, assert (via `compareChartSeries`) that each of
   its current consumers (`TotalChart`, `SigmaTab`'s Σ line, etc.) still renders identical
   `ChartPoint[]` data post-migration — a smoke/regression check on the shell itself,
   not a new legacy-vs-pipeline data diff (those diffs belong to the consuming charts'
   own parity tests).

## Verification

`npm test -w packages/app -- dateLineChartParity`
