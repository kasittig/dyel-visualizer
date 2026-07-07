# Migrate SessionBarChart to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `SessionBarChart` off `@dyel/core` and add an analogous validation test.

## Context

`SessionBarChart.tsx` is presentation-only — it takes a pre-built `ChartPoint[]` and
renders bars, using `@dyel/core` only for the `formatDate` axis-tick formatter and the
`ChartPoint` type. It has no real business logic of its own; the actual session-volume
aggregation happens upstream (feeding into `SigmaTab`, see `migration/SigmaTab.md`).
Because of that, this is a thinner migration than `ConjugateCharts`/`TotalChart` — it's
mostly a boundary cleanup, not a normalization/aggregation reimplementation.

## Plan

1. Re-export `ChartPoint` from `@dyel/pipeline` (shared dependency with
   `migration/TotalChart.md`'s cleanup item — do once, not twice).
2. Relocate `formatDate` to a display-only utility outside `@dyel/core` (e.g.
   `packages/app/src/utils/` or a small pipeline-adjacent formatting helper) since it's
   pure date-string formatting, not business logic, per the same rationale used for
   `LINE_COLORS` in `ConjugateCharts`.
3. Update `SessionBarChart.tsx`'s imports accordingly; confirm no remaining `@dyel/core`
   references.
4. Add `packages/app/src/pipeline/sessionBarChartParity.test.ts`: since this component has
   no independent aggregation logic, this is a lightweight regression test asserting the
   `ChartPoint[]` shape produced by `SigmaTab`'s pipeline-derived session data renders the
   same bar values as the legacy `buildChartData`-derived data — reuse
   `compareChartSeries` rather than inventing a new diff helper.

## Verification

`npm test -w packages/app -- sessionBarChartParity`
