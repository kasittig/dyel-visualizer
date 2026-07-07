# Add core-vs-pipeline parity test for TotalChart

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
this is the tracking doc for `TotalChart`'s own migration + parity test.

## Context

`TotalChart` is already fully migrated to `runPipeline` (via `usePipelineTotalChartData` +
`pipeline/totalChartSpecs.ts`), and its parity test already exists at
`packages/app/src/pipeline/totalChartParity.test.ts` — it diffs legacy's `buildChartData`
(`@dyel/core`) against pipeline's `runPipeline` output over the real
`test/fixtures/total-chart-sheet.csv` fixture, with hard assertions for squat/bench/total
and a documented soft-warn tier for known divergence (see GitHub issue #451 and the
soft-warn comment block in the test file).

One leftover boundary item: `TotalChart.tsx` still has a type-only import of `ChartPoint`
from `@dyel/core`. Not a runtime call, but worth closing out so the component has zero
`@dyel/core` references of any kind.

## Plan

1. Re-export `ChartPoint` from `@dyel/pipeline` (it's a pure shape used across all chart
   components, not business logic — same rationale as relocating `LINE_COLORS` for
   `ConjugateCharts`).
2. Update `TotalChart.tsx`'s import of `ChartPoint` to come from `@dyel/pipeline` instead
   of `@dyel/core`.
3. Confirm `totalChartParity.test.ts` still passes unchanged — this is a type-only import
   swap, no behavior change expected.

## Verification

`npm run build -w packages/pipeline && npm run build -w packages/app && npm test -w packages/app -- totalChartParity`

## Status

Parity test already implemented and passing (hard-assert squat/bench/total, soft-warn on
documented divergence). Only the `ChartPoint` re-export cleanup above remains.
