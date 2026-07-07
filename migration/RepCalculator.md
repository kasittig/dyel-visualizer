# Migrate RepCalculator to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `RepCalculator` off `@dyel/core` and add an analogous parity test.

## Context

`RepCalculator.tsx` calls `findBestE1RM` plus calculator helpers from
`packages/core/src/utils/stats/repCalculator.ts` to predict weight-for-reps and
reps-for-weight. `@dyel/pipeline`'s `derive/e1rm.ts` already exports `calcE1RM` and
`invertE1RM`, explicitly documented as mirroring `@dyel/core`'s `calcE1RM` exactly — so
the core math primitive already exists on the pipeline side. What's missing is the
"best" selection logic (`findBestE1RM` picks the best historical e1RM across sessions to
seed the calculator), which has no direct pipeline equivalent yet.

## Plan

1. Confirm whether `findBestE1RM`'s selection logic can be expressed as a thin wrapper
   over pipeline's already-normalized `Point[]` series (e.g. max `v` across a canonical's
   points) rather than needing new pipeline-side logic. If it can, implement it as a
   small app-level helper operating on `PipelineResult` data (not a `@dyel/core` call) —
   if it can't, propose the missing selection function as a pipeline change per the
   migration boundary rule.
2. Migrate `RepCalculator.tsx` to use `calcE1RM`/`invertE1RM` from `@dyel/pipeline` plus
   the best-e1RM selection from step 1, replacing all `@dyel/core` calls.
3. Add `packages/app/src/pipeline/repCalculatorParity.test.ts`: `it.each` matrix
   comparing legacy's `calcE1RM`/`findBestE1RM` outputs against the migrated pipeline
   path across representative weight/rep/RPE combinations (synthetic inputs — pure
   numeric function, matching the existing `it.each` matrix testing convention).

## Verification

`npm test -w packages/pipeline -- e1rm && npm test -w packages/app -- repCalculatorParity`
