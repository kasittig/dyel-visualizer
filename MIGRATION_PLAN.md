# Migration Plan — remaining work

Execution order for the still-open per-component migration/parity-test docs in `migration/`.
See `APP_COMPONENTS.md` for the full component inventory and `HANDOFF.md` for task-tracking/
session history. Phases 0–3 and Phase 1 items #1 (`TotalChart`) and #6 (`SigmaTab`) are
**complete** and omitted here — see `HANDOFF.md`'s history if you need that context.
`RepCalculator`/`StrengthScoreCalculator` (formerly item #4 below) are also **complete** —
both components were swapped onto `@dyel/pipeline` and their tracking docs
(`migration/RepCalculator.md`, `migration/StrengthScoreCalculator.md`) deleted accordingly;
see `HANDOFF.md`.

**Architectural constraint:** All remaining component migrations below must use the new shared-context infrastructure introduced in Phase 1 — `PipelineProvider`, `usePipelineModel()`, and `usePipelineDatasets()` from `packages/app/src/context/PipelineContext.tsx` and `packages/app/src/hooks/pipeline/usePipelineDatasets.ts` — rather than adding per-component `runPipeline()` calls. This centralized approach is now the established pattern for all component migrations.

## Remaining items, in dependency order

1. **`migration/DiagnosticsPanel.md`** — pipeline-native replacement not yet ready. A
   follow-up scoping pass found `diagnose()` is missing canonical→display-name resolution, a
   modifier-percentage-baseline-range model, and has a differently-classified status enum
   versus what `DiagnosticsPanel.tsx`'s render logic needs. Requires real pipeline-side work,
   not just wiring, before the component swap can proceed. Hard dependency of `LiftTabPanel`
   (#5 below). See `migration/DiagnosticsPanel.md`'s Status section and `APP_COMPONENTS.md`.
   Tracked: [#461](https://github.com/kasittig/dyel-visualizer/issues/461).

2. **`migration/ConjugateCharts.md`** — pipeline-native replacement validated
   (`conjugateChartSpecs()` + fixed normalization model), but the component itself is still on
   `@dyel/core` at runtime; the swap was deliberately deferred pending normalization-divergence
   root-cause work, which has since substantially closed (see `HANDOFF.md`). A 2026-07-08
   wire-verify-revert dry run confirmed the swap is mechanically ready (full suite + build
   green with it live), then reverted the call-site changes — still not a committed swap, and
   the exact-match gate (`APP_COMPONENTS.md`) still isn't met (bench 7.0% / deadlift 0.4%
   `normalized` divergence remain soft-warned). Blocks both `VariationRadarChart` (#3) and
   `LiftTabPanel` (#4). Tracked: [#459](https://github.com/kasittig/dyel-visualizer/issues/459).

3. **`migration/VariationRadarChart.md`** — pipeline-native replacement
   (`conjugateChartSpecs()` + `snapshotVariationsFromPipeline()`) validated and parity-tested,
   component swap deliberately deferred: (1) avoid reintroducing divergence risk into a second
   user-facing chart ahead of #2 landing — still open, narrowed but not exact-match; (2) ~~the
   pipeline snapshot only carries e1RM values, not the last-session detail (date, sets, reps,
   weight, RPE) the component's tooltip currently shows~~ — **resolved 2026-07-08** via the new
   `packages/app/src/pipeline/lastSessionDetail.ts` builder. Depends on #2's snapshot-diff logic
   (`diffVariationSnapshot`, now backed by the promoted runtime util
   `packages/app/src/utils/variationSnapshot.ts`). A 2026-07-08 wire-verify-revert dry run
   confirmed the full swap chain (component + `LiftTabPanel.tsx`) works end-to-end, then
   reverted the call-site changes — still not a committed swap, still blocked on (1). Hard
   dependency of `LiftTabPanel` (#4). Tracked:
   [#460](https://github.com/kasittig/dyel-visualizer/issues/460).

4. **`migration/LiftTabPanel.md`** — composition root, last. Explicitly blocked on #1
   (`DiagnosticsPanel`), #2 (`ConjugateCharts`), and #3 (`VariationRadarChart`) all landing
   first; the `deadliftStance`-on-`AthleteContext` prerequisite (`HANDOFF.md` Part A) is
   already complete, so it's no longer a blocker here.

## Off to the side, any time

- **`migration/ValidatorPage.md`** — no technical dependency on the others; still blocked on a
  scope decision ("is this even in scope for migration?"), not sequencing. Raise the scope
  question whenever convenient — the actual test-writing can happen any time after.

## Parallelization note

#2 and #3 are sequential (`VariationRadarChart` depends on `ConjugateCharts`). #1
(`DiagnosticsPanel`) has no dependency on either and can run concurrently with them. #4
(`LiftTabPanel`) must come last regardless of how the rest is split.
