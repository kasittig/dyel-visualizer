# Add core-vs-pipeline parity test for ConjugateCharts

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`
(`@dyel/core` vs `@dyel/pipeline` regression harness for `TotalChart`), add an analogous
parity test for `ConjugateCharts`.

## Context

`ConjugateCharts` is already fully migrated to `runPipeline` (via `useConjugateChartData` +
`conjugateChartSpecs(liftType)`). Unlike `TotalChart`, there's no single legacy `@dyel/core`
function producing the same date-series shape — the closest legacy analogue is
`VariationRadarChart.tsx`'s `normalizeToBaseE1RM`-based radar snapshot (last-session-only,
not a time series).

## Plan

1. **Pipeline-only sanity tier**: reuse `compareChartSeries` over `conjugateChartSpecs(liftType)`
   output (per-variation + normalized series), `it.each` per variation name.
2. **Legacy-vs-pipeline snapshot tier**: reduce pipeline's per-variation series to
   last-value-per-variation and diff against `VariationRadarChart`'s `normalizeToBaseE1RM`
   snapshot logic — not a full `diffChartSeries` date join, since legacy is a snapshot, not
   a series.
3. New file: `packages/app/src/pipeline/conjugateChartParity.test.ts`. Reuse existing fixture
   `test/fixtures/total-chart-sheet.csv` (verify per-lift-type variation coverage first).
   Possibly add a small `testUtils/diffVariationSnapshot.ts` helper if the snapshot-diff logic
   isn't a one-liner, documented in `testUtils/CLAUDE.md`.

## Verification

`npm test -w packages/app -- conjugateChartParity`
