# Migration Plan — remaining work

Execution order for the still-open per-component migration/parity-test docs in `migration/`.
See `APP_COMPONENTS.md` for the full component inventory and `HANDOFF.md` for task-tracking/
session history. Phases 0–3 and Phase 1 items #1 (`TotalChart`) and #6 (`SigmaTab`) are
**complete** and omitted here — see `HANDOFF.md`'s history if you need that context.
`RepCalculator`/`StrengthScoreCalculator` (formerly item #4 below) are also **complete** —
both components were swapped onto `@dyel/pipeline` and their tracking docs
(`migration/RepCalculator.md`, `migration/StrengthScoreCalculator.md`) deleted accordingly;
see `HANDOFF.md`. `DiagnosticsPanel` is also **complete** — component was swapped onto
`@dyel/pipeline`, tracking doc deleted, see `HANDOFF.md`. **`ConjugateCharts` (formerly item
#1 below) is also complete** (2026-07-08, closes #459) — see `migration/ConjugateCharts.md`'s
"ConjugateCharts swap-over" section. **`VariationRadarChart` (item #1 below) is also
complete** (2026-07-09, closes #460) — see `migration/VariationRadarChart.md`'s
"VariationRadarChart swap-over" section. **`LiftTabPanel` (item #2 below) is also complete**
(2026-07-09) — see `migration/LiftTabPanel.md`'s "LiftTabPanel swap-over" section.
**Phase 1 migration plan is complete** — all items have landed, and this document is retained
for historical reference only.

**Architectural constraint:** All remaining component migrations below must use the new shared-context infrastructure introduced in Phase 1 — `PipelineProvider`, `usePipelineModel()`, and `usePipelineDatasets()` from `packages/app/src/context/PipelineContext.tsx` and `packages/app/src/hooks/pipeline/usePipelineDatasets.ts` — rather than adding per-component `runPipeline()` calls. This centralized approach is now the established pattern for all component migrations.

## Remaining items, in dependency order

1. ~~**`migration/VariationRadarChart.md`**~~ — **complete** (2026-07-09, closes #460). Its
   own cross-exercise per-target normalization (`normalizeToBaseE1RM`) was deprecated, not
   ported, following the exact precedent `ConjugateCharts` set for its dropdown — but unlike
   `ConjugateCharts`' soft-warn-accepted residual, the production data path here (raw
   per-variation e1RM) has genuine 0.0% divergence, now hard-asserted (promoted from
   soft-warn) in `variationRadarChartParity.test.ts`. See
   `migration/VariationRadarChart.md`'s "VariationRadarChart swap-over" section for full
   detail.

2. ~~**`migration/LiftTabPanel.md`**~~ — **complete** (2026-07-09). Composition root
   migration: `liftType` prop widened to plain `string`, `DeadliftStancePreference` type-only
   import kept per `DiagnosticsPanel` precedent. Pure composition (no data transformation), so
   no parity test needed. See `migration/LiftTabPanel.md`'s "LiftTabPanel swap-over" section
   for full detail.

## Off to the side, any time

- **`migration/ValidatorPage.md`** — no technical dependency on the others; still blocked on a
  scope decision ("is this even in scope for migration?"), not sequencing. Raise the scope
  question whenever convenient — the actual test-writing can happen any time after.

## Parallelization note

#2 (`LiftTabPanel`) must come last, after #1 (`VariationRadarChart`) lands.
