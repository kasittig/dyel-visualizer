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
`deadliftStance` athlete-preference work tracked in `HANDOFF.md` (Part A) — the
`DeadliftStancePreference` type this component depends on today should become
`AthleteContext.deadliftStance` on the pipeline side, per that plan.

## Plan

1. Sequence this after `ConjugateCharts`, `VariationRadarChart`, and `DiagnosticsPanel`
   migrations land, and after `HANDOFF.md` Part A (`deadliftStance` on
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

## LiftTabPanel swap-over (2026-07-09)

**Plan stale, work trivial: completed this session.** The original plan assumed `filterByDateRange` from `@dyel/core` was still called and that a dedicated `liftTabPanelParity.test.ts` harness would be needed (item #4 in the plan above). Both assumptions were false — dead code removed as part of the `VariationRadarChart` migration (closing #460) had already eliminated `LiftTabPanel`'s runtime `@dyel/core` dependencies.

By the time `VariationRadarChart`'s swap landed (2026-07-09), `LiftTabPanel.tsx` (the composition root rendering `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel`) had no remaining `@dyel/core` runtime calls — only type-only imports: `DeadliftStancePreference` and `LiftType`. The `liftType` prop was widened from `LiftType` to plain `string`, matching the same pattern its own children (`ConjugateCharts`, `VariationRadarChart`) already use. The `LiftType` import was removed; `DeadliftStancePreference` was intentionally kept, matching the precedent already established by `DiagnosticsPanel.tsx` (marked complete in `APP_COMPONENTS.md` despite retaining this exact same type-only import).

**No parity test was written** — `LiftTabPanel.tsx` does pure composition/prop-passing (threading `liftType`/`dateRange`/`unit`/callbacks to children, managing shared `selectedVariation` state). It contains no data transformation, filtering, or aggregation, so there's no legacy-vs-pipeline divergence to regression-test. The pattern `VariationRadarChart` and `ConjugateCharts` introduced (per-child parity tests) applies to children that transform data; the composition root itself does not.

### Verification

`grep -rn "@dyel/core" packages/app/src/components/pages/LiftTabPanel.tsx` returns only the `DeadliftStancePreference` type-only import, not runtime business logic.
