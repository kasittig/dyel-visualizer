# Core-vs-pipeline parity test for ConjugateCharts

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`
(`@dyel/core` vs `@dyel/pipeline` regression harness for `TotalChart`), an analogous
parity test exists for `ConjugateCharts` at
`packages/app/src/pipeline/conjugateChartParity.test.ts`.

## Context

`ConjugateCharts` is **not** migrated to `@dyel/pipeline` — it still calls
`useConjugateChartData` (which wraps `@dyel/core`'s `buildVariationChartData`)
and imports `LINE_COLORS`/`RepCalcStats` directly from `@dyel/core`.

It was previously migrated to `runPipeline` (via `useConjugateChartData` +
`conjugateChartSpecs(liftType)`), but that migration was **deliberately
reverted** (`46f267f`, "Revert ConjugateCharts from @dyel/pipeline back to
@dyel/core") after this parity test surfaced real divergence between the
legacy and pipeline outputs — see `HANDOFF.md`, Session 6, for the full
writeup.

The pipeline-native replacement wasn't deleted: `conjugateChartSpecs.ts`
(`packages/app/src/pipeline/conjugateChartSpecs.ts`) still exists with no
other importer, kept solely to back this parity test as a documented
regression harness — the same treatment `totalChartSpecs.ts` gets for
`totalChartParity.test.ts`.

Unlike `TotalChart`, there's no single legacy `@dyel/core` function producing
the same date-series shape — the closest legacy analogue is
`VariationRadarChart.tsx`'s `normalizeToBaseE1RM`-based radar snapshot
(last-session-only, not a time series). This parity test instead runs the
real component's legacy path (`buildVariationChartData`) side-by-side with
`conjugateChartSpecs` + `runPipeline` over the same fixture and soft-warns
(`console.warn`, not hard-fail) on divergence, per the intentional-exception
pattern documented in `packages/app/CLAUDE.md`.

## Current state

1. **Pipeline-only sanity tier**: `compareChartSeries` over
   `conjugateChartSpecs(liftType)` output (per-variation + normalized series).
2. **Core-vs-pipeline soft-warn tier**: `it.each` over lift types, diffing
   legacy `buildVariationChartData` output against pipeline output via
   `joinChartPointsByDate`/`diffSeries` from `testUtils/diffChartSeries.ts`.
   Diffs are logged via `console.warn`, not hard-asserted, since real
   normalization divergence between the two implementations is expected and
   tracked separately (this is what motivated the revert above).
3. File: `packages/app/src/pipeline/conjugateChartParity.test.ts`. Reuses
   fixture `test/fixtures/total-chart-sheet.csv`.

## Before re-attempting the ConjugateCharts migration

Any future attempt to swap `ConjugateCharts` back onto `@dyel/pipeline` must
first resolve the divergence this parity test surfaced (root-caused in
`HANDOFF.md`, Session 6) — re-migrating without addressing it would just
reintroduce the bug that motivated the revert.

## Verification

`npm test -w packages/app -- conjugateChartParity`
