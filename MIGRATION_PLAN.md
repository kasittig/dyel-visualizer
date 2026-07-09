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
"ConjugateCharts swap-over" section. **`VariationRadarChart` (formerly item #1) is also
complete** (2026-07-09, closes #460) — its cross-exercise per-target normalization
(`normalizeToBaseE1RM`) was deprecated (not ported), and the production data path (raw
per-variation e1RM) achieved 0.0% divergence from legacy (hard-asserted in parity test).
See `migration/VariationRadarChart.md`'s "VariationRadarChart swap-over" section.
**`LiftTabPanel` (formerly item #2) is also complete** (2026-07-09) — a pure composition-root
migration with `liftType` widened to plain `string`, requiring no parity test. See
`migration/LiftTabPanel.md`'s "LiftTabPanel swap-over" section.
**Phase 1 migration plan is complete** — all items have landed, and this document is retained
for historical reference only.

**Architectural constraint:** All component migrations must use the new shared-context infrastructure introduced in Phase 1 — `PipelineProvider`, `usePipelineModel()`, and `usePipelineDatasets()` from `packages/app/src/context/PipelineContext.tsx` and `packages/app/src/hooks/pipeline/usePipelineDatasets.ts` — rather than adding per-component `runPipeline()` calls. This centralized approach is now the established pattern for all component migrations.

## Off to the side, any time

- **`migration/ValidatorPage.md`** — no technical dependency on the others; still blocked on a
  scope decision ("is this even in scope for migration?"), not sequencing. Raise the scope
  question whenever convenient — the actual test-writing can happen any time after.
