# Migrate VariationRadarChart to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`
and `migration/ConjugateCharts.md`, migrate `VariationRadarChart` off `@dyel/core` and add
an analogous parity test.

## Context

`VariationRadarChart.tsx` currently calls `normalizeToBaseE1RM` and depends on the
`ConjugateExercise` type (both `@dyel/core`) to build a last-session-only radar snapshot
per variation. This is the exact legacy analogue that `migration/ConjugateCharts.md`'s
snapshot tier already diffs against pipeline's per-variation series — meaning the hard
part (reducing pipeline's `Point[]` series to a last-value-per-variation snapshot) is
already being solved by that work and should be reused, not reinvented.

## Plan

1. Land `migration/ConjugateCharts.md` first — its snapshot-diff logic
   (`testUtils/diffVariationSnapshot.ts`, if extracted) is the direct dependency for this
   migration.
2. Migrate `VariationRadarChart.tsx` itself to consume pipeline's per-variation snapshot
   (derived from `conjugateChartSpecs(liftType)` output) instead of calling
   `normalizeToBaseE1RM` directly, per the pipeline migration boundary rule (call only
   `runPipeline`, never `@dyel/core`).
3. Add `packages/app/src/pipeline/variationRadarChartParity.test.ts`: reuse
   `diffVariationSnapshot` (or equivalent) to diff legacy's `normalizeToBaseE1RM` snapshot
   against the now-migrated component's pipeline-derived snapshot, `it.each` per variation.
4. Reuse `test/fixtures/total-chart-sheet.csv`; verify per-lift-type variation coverage
   before asserting.

## Verification

`npm test -w packages/app -- variationRadarChartParity`
