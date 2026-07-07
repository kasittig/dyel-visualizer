# Migrate DiagnosticsPanel to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
validate a pipeline-native replacement for `DiagnosticsPanel` and add an analogous parity
test. **The component swap-over itself is intentionally deferred — see "Status" below
before doing any further work here.**

## Context

`DiagnosticsPanel.tsx` calls `generateDiagnostics` (`packages/core/src/load/generateDiagnostics.ts`).
`@dyel/pipeline` has a direct-looking equivalent: `analyze/diagnose.ts`'s `diagnose()`
produces a `DiagnosticsReport` (variants, weaknesses, unassessed), already wired up and
exposed on `PipelineResult.diagnostics` via `pipeline.ts`, and already wrapped by
`packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts`.

This looked like the best-positioned remaining migration — no new pipeline functionality
appeared necessary, only wiring the component to the existing output. **That assessment
was wrong** — a closer look at the actual fields `DiagnosticsPanel.tsx`'s render logic
consumes surfaced a real shape/feature gap versus `diagnose()`'s output, described in
"Status" below.

## Plan

1. ~~Migrate `DiagnosticsPanel.tsx` to consume `PipelineResult.diagnostics` (via
   `runPipeline`) instead of calling `generateDiagnostics` directly~~ — **deferred, not
   done.** See "Status" below for why. Do not swap `DiagnosticsPanel.tsx` over to consume
   `usePipelineDiagnostics` until the blockers there are resolved.
2. Added `packages/app/src/pipeline/diagnosticsPanelParity.test.ts`: runs both legacy's
   `generateDiagnostics` and pipeline's `runPipeline(...).diagnostics` over
   `test/fixtures/total-chart-sheet.csv`, and checks structural presence of fields plus
   soft-warns on status-classification divergence. This test intentionally does **not**
   (and structurally cannot) assert `displayName`/`averageIndex`/`expectedBaseline`
   equivalence, because pipeline's `diagnose()` has no equivalent fields to compare — see
   "Status."

## Verification

`npm test -w packages/app -- diagnosticsPanelParity`

## Status

**Pipeline-native replacement exists and has a passing (soft-warn) parity test; component
swap intentionally deferred.** Unlike `RepCalculator`/`StrengthScoreCalculator` (genuinely
small, drop-in hook swaps), scoping this swap directly against `DiagnosticsPanel.tsx`'s
actual render logic surfaced a real, non-trivial feature gap between legacy's
`ConjugateExercise`-shaped diagnostic result and pipeline's `VariantAssessment`:

- **No display-name resolution.** `diagnose()`'s `VariantAssessment.canonical` is a bare
  internal identifier/slug; the table renders `displayName` (a human-readable exercise
  name). Grepped `packages/pipeline/src` for any canonical→display-name mapping — none
  exists. This isn't a rename; pipeline has no concept of display names at all today.
- **No percentage-baseline-range model.** The table renders `averageIndex` (a %, e.g.
  92.4) against `expectedBaseline` (a range string like `"95–105%"`, derived from
  equipment/stance/bar modifier percentage tables in `generateDiagnostics.ts`).
  `diagnose()` instead produces a single `expectedE1rmKg`/`actualE1rmKg`/`ratio` — no range,
  and no equivalent of the modifier-percentage-range table exists in `@dyel/pipeline`.
- **Status enum + classification logic differ, not just names.** Legacy:
  `'optimal' | 'overtrained' | 'weakness'`, classified via the baseline min/max range above.
  Pipeline: `'optimal' | 'weakness' | 'overperforming'`, classified via a flat tolerance
  band around `ratio === 1`. Different underlying model — a real behavioral-divergence
  risk, not a labeling fix, and one `diagnosticsPanelParity.test.ts` only soft-warns on
  rather than reconciling.
- **No additional-weight offset data.** The table's `addlWtOffset`/chain-band label
  formatting has no pipeline-side source.
- **Props aren't self-contained to this component.** `usePipelineDiagnostics` wants
  `inputMode`/`url`/`pastedText`/`refreshToken` (it self-fetches/parses), while
  `DiagnosticsPanel.tsx` currently receives pre-computed `rows`/`targetName`/
  `variantFactor`/`addlWtOffset` from `LiftTabPanel.tsx`. Swapping would also require
  reworking `LiftTabPanel.tsx`'s prop-drilling, not just this component in isolation.

Per the project's existing convention (missing pipeline functionality becomes a proposed
pipeline change, not a client-side workaround — see `packages/app/CLAUDE.md`'s pipeline
migration boundary rule), this is now tracked as a deferred item alongside
`VariationRadarChart`, not a "small swap." Before re-attempting: add a canonical→display-name
resolution and a modifier-percentage-range/baseline model to `@dyel/pipeline`'s `diagnose()`
(or a sibling function), and reconcile the status-classification divergence — track these as
prerequisites, not as part of "swap the hook and go."
