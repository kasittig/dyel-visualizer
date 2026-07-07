# Migrate SigmaTab to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `SigmaTab` off `@dyel/core` and add an analogous parity test.

## Context

`SigmaTab.tsx` calls `buildChartData` and depends on `LiftType`/`SessionStats`
(`@dyel/core`). This is the closest analogue to `TotalChart`'s already-completed
migration — `buildChartData` is the same legacy function `TotalChart`'s parity test
diffs against pipeline's `runPipeline` output — so this migration should reuse
`pipeline/totalChartSpecs.ts` and the `totalChartParity.test.ts` harness pattern almost
directly, extended to `SigmaTab`'s additional composed charts (`SessionBarChart`,
`SigmaRadarChart`) rather than inventing a new aggregation path.

## Plan

1. Migrate `SigmaTab.tsx` to source its `TotalChart`/`SessionBarChart` data from
   `runPipeline` + `totalChartSpecs.ts` (same pipeline call `TotalChart` itself already
   uses) instead of calling `buildChartData` directly, per the migration boundary rule.
2. Confirm `SigmaRadarChart`'s data needs (per-lift-type `SessionStats`) are covered by
   existing pipeline dataset specs, or identify the gap as a proposed pipeline change.
3. Add `packages/app/src/pipeline/sigmaTabParity.test.ts`: reuse
   `totalChartParity.test.ts`'s structure (real fixture, `runPipeline` vs
   `buildChartData`, `diffChartSeries` + `compareChartSeries`, hard-assert with
   documented soft-warn tiers) extended to cover the additional Σ-tab series
   (session volume, per-lift-type stats).

## Verification

`npm test -w packages/app -- sigmaTabParity`
