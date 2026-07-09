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
"ConjugateCharts swap-over" section.

**Architectural constraint:** All remaining component migrations below must use the new shared-context infrastructure introduced in Phase 1 — `PipelineProvider`, `usePipelineModel()`, and `usePipelineDatasets()` from `packages/app/src/context/PipelineContext.tsx` and `packages/app/src/hooks/pipeline/usePipelineDatasets.ts` — rather than adding per-component `runPipeline()` calls. This centralized approach is now the established pattern for all component migrations.

## Remaining items, in dependency order

1. **`migration/VariationRadarChart.md`** — pipeline-native replacement
   (`conjugateChartSpecs()` + `snapshotVariationsFromPipeline()`) validated and parity-tested,
   component swap deliberately deferred: (1) ~~avoid reintroducing divergence risk into a
   second user-facing chart ahead of `ConjugateCharts` landing~~ — **`ConjugateCharts` has
   since landed** (2026-07-08, with its residual divergence explicitly accepted rather than
   closed to an exact match — see `migration/ConjugateCharts.md`); re-evaluate whether the
   same explicit-acceptance approach can now unblock this swap, rather than waiting on a
   hard-assert exact match that may never come; (2) ~~the pipeline snapshot only carries
   e1RM values, not the last-session detail (date, sets, reps, weight, RPE) the component's
   tooltip currently shows~~ — **resolved 2026-07-08** via the new
   `packages/app/src/pipeline/lastSessionDetail.ts` builder. Depends on `ConjugateCharts`'
   snapshot-diff logic (`diffVariationSnapshot`, now backed by the promoted runtime util
   `packages/app/src/utils/variationSnapshot.ts`). A 2026-07-08 wire-verify-revert dry run
   confirmed the full swap chain (component + `LiftTabPanel.tsx`) works end-to-end, then
   reverted the call-site changes — still not a committed swap. Hard dependency of
   `LiftTabPanel` (#2). Tracked: [#460](https://github.com/kasittig/dyel-visualizer/issues/460).

2. **`migration/LiftTabPanel.md`** — composition root, last. Explicitly blocked on #1
   (`VariationRadarChart`) landing first (`ConjugateCharts` no longer blocks this — it's
   done); the `deadliftStance`-on-`AthleteContext` prerequisite (`HANDOFF.md` Part A) is
   already complete, so it's no longer a blocker here.

## Off to the side, any time

- **`migration/ValidatorPage.md`** — no technical dependency on the others; still blocked on a
  scope decision ("is this even in scope for migration?"), not sequencing. Raise the scope
  question whenever convenient — the actual test-writing can happen any time after.

## Parallelization note

#2 (`LiftTabPanel`) must come last, after #1 (`VariationRadarChart`) lands.
