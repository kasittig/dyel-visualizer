# Migrate StrengthScoreCalculator to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `StrengthScoreCalculator` off `@dyel/core` and add an analogous parity test.

## Context

`StrengthScoreCalculator.tsx` calls `calculateMetrics` (`packages/core/src/utils/math/metrics.ts`),
which computes Wilks/DOTS/Schwartz-Malone scores and percentile ranks from bodyweight,
total, gender, and units. Unlike `DiagnosticsPanel` or `RepCalculator`,
`@dyel/pipeline` has **no existing equivalent** for this — `derive/athlete.ts` exposes
`wilks`/`dots` helpers used internally by `dataset/build.ts`'s composite specs, but there
is no percentile-rank or Schwartz-Malone support, and no single function matching
`calculateMetrics`'s signature/output shape.

Per the pipeline migration boundary rule, missing functionality is a proposed pipeline
change, not a workaround in app code.

## Plan

1. Propose exposing a `computeStrengthScores` (or similar) function from `@dyel/pipeline`
   that wraps the existing `wilks`/`dots` derive helpers and adds Schwartz-Malone +
   percentile-rank support, matching `LiftMetrics`'s current output shape so the UI
   doesn't need to change.
2. Once available, migrate `StrengthScoreCalculator.tsx` to call the new pipeline
   function instead of `calculateMetrics`.
3. Add `packages/app/src/pipeline/strengthScoreCalculatorParity.test.ts`: diff legacy's
   `calculateMetrics` output against the new pipeline function across a small `it.each`
   matrix of bodyweight/total/gender/unit combinations (synthetic inputs are fine here —
   this is a pure numeric function, not a series requiring a real sheet fixture).

## Verification

`npm test -w packages/pipeline -- strengthScore && npm test -w packages/app -- strengthScoreCalculatorParity`
