# HANDOFF — Phase 3 of MIGRATION_PLAN.md (SessionBarChart + SigmaChart + DateLineChart) + DiagnosticsPanel re-scoping

## Context

`migration-phase-1` is a feature branch implementing `MIGRATION_PLAN.md`'s pipeline-native
migration of `packages/app` components off `@dyel/core` onto `@dyel/pipeline`. Phases 1
(TotalChart, ConjugateCharts, DiagnosticsPanel, RepCalculator, StrengthScoreCalculator) and 2
(SigmaTab, VariationRadarChart) were already complete going into this session. This session
executed Phase 3 (`migration/SessionBarChart.md`, `migration/SigmaChart.md`,
`migration/DateLineChart.md`), then did a re-scoping pass on `DiagnosticsPanel`'s deferred swap
that corrected a stale doc assumption. Full task tracking lives in `SPECIFICATIONS.md`'s Phase 3
section (bottom of the file).

## Progress Overview

- **`SessionBarChart.tsx`/`SigmaChart.tsx`/`DateLineChart.tsx` fully migrated** off
  `@dyel/core` — all three were pure presentation shells with no aggregation logic of their
  own, so this was a boundary-import cleanup, not a data migration. Added
  `formatChartDate` (`packages/app/src/utils/pipelineChartUtils.ts`), an exact behavioral
  clone of `@dyel/core`'s `formatDate` tick-formatter (kept distinct from the existing,
  unrelated `Date => string` `formatDate` in `utils/dateUtils.ts`). All three now import
  `ChartPoint` from `@dyel/pipeline`. Zero `@dyel/core` references remain in any of the three.
- Added three new lightweight parity tests (all sanity/regression checks reusing
  `compareChartSeries`, deliberately **not** new legacy-vs-pipeline diffs, since none of the
  three components has independent logic to diff): `packages/app/src/pipeline/
sessionBarChartParity.test.ts` (7 tests), `sigmaChartParity.test.ts` (4 tests),
  `dateLineChartParity.test.ts` (8 tests).
- Updated `MIGRATION_PLAN.md` (Phase 3 status section), `APP_COMPONENTS.md` (`SessionBarChart`/
  `SigmaChart`/`DateLineChart` moved to "Already migrated"), `SPECIFICATIONS.md` (Phase 3
  checklist fully checked off).
- Full verification (independent `qa-reviewer` re-run, not just trusting the implementer):
  `npm run build` clean for `packages/pipeline`/`packages/core`/`packages/app`; `npm test`
  all green — **pipeline 12 files/188 tests, app 19 files/200 tests** (up from 16/181 before
  this session). No regressions.
- **Re-scoped `DiagnosticsPanel`'s deferred swap and corrected the docs.** `APP_COMPONENTS.md`
  had characterized it as a "small, well-understood" swap (like `RepCalculator`/
  `StrengthScoreCalculator`). Scoping it directly against `DiagnosticsPanel.tsx`'s actual
  render logic (not just `diagnosticsPanelParity.test.ts`'s structural checks) found this is
  false — see Decisions below. No code was changed for this; it was a docs-only correction.
  `migration/DiagnosticsPanel.md`, `APP_COMPONENTS.md`, and `MIGRATION_PLAN.md` were all
  updated to reflect the corrected assessment. The swap itself remains deferred and untouched.

## Decisions Made & Rationale

- **`DiagnosticsPanel`'s swap is a real blocker, not a wiring task** — same category as
  `VariationRadarChart`'s deferred swap. Concretely, pipeline's `diagnose()`
  (`packages/pipeline/src/analyze/diagnose.ts`) is missing, relative to what
  `DiagnosticsPanel.tsx` actually renders:
  1. Canonical→display-name resolution (pipeline only has a bare `canonical` slug; grepped
     `packages/pipeline/src` — no display-name concept exists anywhere).
  2. A modifier-percentage-baseline-range model (`averageIndex`/`expectedBaseline`, e.g.
     `"95–105%"`, from `generateDiagnostics.ts`'s equipment/stance/bar tables) — pipeline only
     produces a flat `expectedE1rmKg`/`ratio`, no range.
  3. A differently-classified status enum — not just a rename. Legacy:
     `'optimal' | 'overtrained' | 'weakness'` via baseline min/max range. Pipeline:
     `'optimal' | 'weakness' | 'overperforming'` via a flat tolerance band around ratio 1.0.
     Real behavioral-divergence risk, which `diagnosticsPanelParity.test.ts` only soft-warns
     on rather than reconciling.
  4. No additional-weight (`addlWtOffset`) offset data.
  5. `usePipelineDiagnostics`'s props (`inputMode`/`url`/`pastedText`/`refreshToken`,
     self-fetching) don't match `DiagnosticsPanel.tsx`'s current pre-computed
     `rows`/`targetName`/`variantFactor`/`addlWtOffset` props — a swap would also touch
     `pages/LiftTabPanel.tsx`'s prop-drilling.

  Per the project's existing convention (missing pipeline functionality is a proposed
  pipeline change, not a client-side workaround), this is now tracked as deferred alongside
  `ConjugateCharts`/`VariationRadarChart`, not attempted this session.

- **`SessionBarChart`/`SigmaChart`/`DateLineChart` needed no new pipeline work** — all three
  are presentation-only shells (confirmed by reading each component directly before
  delegating), so their migration was purely the `ChartPoint`/`formatDate` boundary cleanup
  already anticipated by their `migration/*.md` docs, with no surprises (unlike
  `DiagnosticsPanel`).
- Re-verified test/build numbers independently via a `qa-reviewer` subagent pass rather than
  trusting the `feature-implementer`'s self-reported counts verbatim, per the standing project
  practice (see prior `HANDOFF.md` note about a previously-wrong pipeline test count).

## Open TODOs

- None blocking for Phase 3 — it's fully closed out.
- Next per `MIGRATION_PLAN.md`: **Phase 4** (`migration/LiftTabPanel.md`) is blocked on three
  items, all of which now require real pipeline-side work (not just wiring):
  1. `ConjugateCharts` re-migration — blocked on the unresolved normalization divergence that
     caused its prior revert (`46f267f`).
  2. `VariationRadarChart` swap — blocked on the same divergence risk, plus a last-session
     tooltip-detail gap (date/sets/reps/weight/RPE) not present in the pipeline snapshot.
  3. `DiagnosticsPanel` swap — blocked on the gaps enumerated above (display-name resolution,
     percentage-baseline-range model, status-classification reconciliation, add'l-weight
     offset data).
     The Phase 0 `deadliftStance` prerequisite is itself already complete (see
     `SPECIFICATIONS.md`'s Part A/B section) — it's not a blocker.
- If picking up any of the three Phase 4 blockers, treat each as a pipeline-feature-addition
  task first (scope what needs to be added to `@dyel/pipeline`), not a component-swap task —
  that's the lesson from both `VariationRadarChart` and this session's `DiagnosticsPanel`
  re-scoping.
- `.claude/skills/handoff/SKILL.md` still shows as modified in `git status` (uncommitted,
  pre-existing, unrelated to this session's work) — not touched or investigated here, same as
  prior handoffs.

## Files Touched

- `packages/app/src/utils/pipelineChartUtils.ts` (new `formatChartDate` helper)
- `packages/app/src/components/charts/SessionBarChart.tsx` (migrated off `@dyel/core`)
- `packages/app/src/components/charts/SigmaChart.tsx` (migrated off `@dyel/core`)
- `packages/app/src/components/charts/DateLineChart.tsx` (migrated off `@dyel/core`)
- `packages/app/src/pipeline/sessionBarChartParity.test.ts` (new)
- `packages/app/src/pipeline/sigmaChartParity.test.ts` (new)
- `packages/app/src/pipeline/dateLineChartParity.test.ts` (new)
- `MIGRATION_PLAN.md` (Phase 3 status added; Phase 4 blocker description corrected)
- `APP_COMPONENTS.md` (inventory updated; `DiagnosticsPanel` re-scoped from "small swap" to
  "real blocker")
- `migration/DiagnosticsPanel.md` (rewritten — swap marked deferred, with full gap analysis)
- `SPECIFICATIONS.md` (Phase 3 checklist fully checked off)
- `HANDOFF.md` (this file)

## Suggested Next Skills

- None required immediately. If resuming migration work, start by picking one of the three
  Phase 4 blockers and scoping the actual `@dyel/pipeline` feature work needed (see Open TODOs)
  before touching any component file.
