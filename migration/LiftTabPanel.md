# Migrate LiftTabPanel to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `LiftTabPanel` off `@dyel/core` and add an analogous parity test.

## Context

`LiftTabPanel.tsx` calls `filterByDateRange` and depends on `DeadliftStancePreference`/
`LiftType` (`@dyel/core`). It's a composition root — it renders `ConjugateCharts` +
`VariationRadarChart` + `DiagnosticsPanel` with shared variation-highlight state — so its
own migration is blocked on its children's migrations landing first
(`migration/ConjugateCharts.md`, `migration/VariationRadarChart.md`,
`migration/DiagnosticsPanel.md`). It also directly overlaps with the in-flight
`deadliftStance` athlete-preference work tracked in `SPECIFICATIONS.md` (Part A) — the
`DeadliftStancePreference` type this component depends on today should become
`AthleteContext.deadliftStance` on the pipeline side, per that plan.

## Plan

1. Sequence this after `ConjugateCharts`, `VariationRadarChart`, and `DiagnosticsPanel`
   migrations land, and after `SPECIFICATIONS.md` Part A (`deadliftStance` on
   `AthleteContext`) is merged — both are hard dependencies, not just convenience
   ordering.
2. Migrate `filterByDateRange` usage to operate on pipeline's already-normalized
   `Point[]`/`RechartsRow[]` shapes (date-range filtering is a generic operation that
   likely already has a pipeline-side equivalent via `RenderParams.dateRange` in
   `dataset/build.ts` — confirm before adding new logic).
3. Replace `DeadliftStancePreference`/`LiftType` core-type dependencies with
   `AthleteContext`/pipeline equivalents.
4. Add `packages/app/src/pipeline/liftTabPanelParity.test.ts`: since this component is
   primarily composition + date-range filtering (not aggregation), this test should
   assert the filtered `Point[]`/`RechartsRow[]` passed to each child matches legacy's
   `filterByDateRange` output across a small `it.each` matrix of date ranges — reuse
   `diffChartSeries`/`compareChartSeries` rather than a new comparison helper.

## Verification

`npm test -w packages/app -- liftTabPanelParity`
