# Migrate DiagnosticsPanel to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`,
migrate `DiagnosticsPanel` off `@dyel/core` and add an analogous parity test.

## Context

`DiagnosticsPanel.tsx` calls `generateDiagnostics` (`packages/core/src/load/generateDiagnostics.ts`).
Unlike most other "not yet migrated" components, `@dyel/pipeline` already has a direct
equivalent: `analyze/diagnose.ts`'s `diagnose()` produces a `DiagnosticsReport` (variants,
weaknesses, unassessed), and it's already wired up and exposed on `PipelineResult.diagnostics`
via `pipeline.ts`. This is the best-positioned remaining migration — no new pipeline
functionality is required, only wiring the component to the existing output.

## Plan

1. Migrate `DiagnosticsPanel.tsx` to consume `PipelineResult.diagnostics` (via
   `runPipeline`) instead of calling `generateDiagnostics` directly, per the pipeline
   migration boundary rule.
2. Add `packages/app/src/pipeline/diagnosticsPanelParity.test.ts`: run both legacy's
   `generateDiagnostics` and pipeline's `runPipeline(...).diagnostics` over
   `test/fixtures/total-chart-sheet.csv`, and diff `variants`/`weaknesses`/`unassessed`
   using a small dedicated comparison helper (not `diffChartSeries` — this isn't a
   date-series shape). Hard-assert where the two implementations are expected to agree;
   soft-warn (`console.warn`) on any known divergence in tolerance/stale-days gating,
   following the same convention as `totalChartParity.test.ts`.

## Verification

`npm test -w packages/app -- diagnosticsPanelParity`
