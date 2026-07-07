# Migrate SigmaChart to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `SigmaChart` off `@dyel/core` and add an analogous validation test.

## Context

`SigmaChart.tsx`'s only `@dyel/core` dependency is the `ChartPoint` type — no runtime
function calls. This is the smallest of the remaining boundary violations in
`APP_COMPONENTS.md`.

## Plan

1. Depend on the `ChartPoint` re-export from `@dyel/pipeline` (shared cleanup item, see
   `migration/TotalChart.md`).
2. Update `SigmaChart.tsx`'s type-only import; confirm no remaining `@dyel/core`
   references.
3. Add `packages/app/src/pipeline/sigmaChartParity.test.ts`: a lightweight test asserting
   the pipeline-sourced `ChartPoint[]` feeding `SigmaChart` (via `SigmaTab`, see
   `migration/SigmaTab.md`) matches legacy's equivalent series using
   `compareChartSeries`. No new diff logic expected — this should be a thin consumer of
   `SigmaTab`'s own parity test fixtures.

## Verification

`npm test -w packages/app -- sigmaChartParity`
