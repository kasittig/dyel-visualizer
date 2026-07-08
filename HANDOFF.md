# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. This session tackled a specific
architectural gap the user raised: they want an MVC-like structure where `@dyel/pipeline`
loads/processes data **once**, additional pure functions derive different "views" on top of
that single run, and `packages/app` components only render already-transformed data. The
codebase was already mid-migration toward this shape, but each `hooks/pipeline/*` hook
(`usePipelineTotalChartData`, `usePipelineDiagnostics`, `usePipelineRepCalculator`)
independently called `runPipeline` itself — this session closed that gap by introducing a
shared pipeline-execution context. Full plan lives at
`/Users/kasittig/.claude/plans/let-s-move-more-towards-refactored-adleman.md` (18 tasks,
tracked in the task tool, IDs match the plan's numbering).

## Progress Overview

Completed Tasks 1–12 and 17–18 of the plan (all verified green: 685 tests across pipeline
(139)/app (225)/core (321), all 3 package builds clean):

- **Phase 1 (shared infra, Tasks 1-5):** Split `runPipeline` in
  `packages/pipeline/src/pipeline.ts` into `runPipelineModel(raw, athlete): PipelineModel`
  (parse→tag→normalize→diagnose, the expensive/view-independent stages, now computing
  points for _every_ registered deriver id) + `buildDatasetsFromModel(model, specs, ui)`
  (the cheap per-view `buildDataset` step — `ui.dateRange` isn't safely post-hoc-filterable
  for composite specs, so this step must stay per-view). `runPipeline` kept as a thin
  back-compat wrapper. Both new functions exported from `@dyel/pipeline`'s barrel. Added
  `useResolvedRawInput` (consolidates fetch/parse/`AbortController` logic that was
  duplicated across 3 hooks) in `packages/app/src/utils/rawInputUtils.ts`. Added
  `PipelineProvider`/`usePipelineModel()` React context in
  `packages/app/src/context/PipelineContext.tsx` (memoizes one `runPipelineModel` call per
  raw-input/athlete change, verified via spy test that it doesn't re-run per consumer). Added
  `usePipelineDatasets(specs, ui)` selector hook in
  `packages/app/src/hooks/pipeline/usePipelineDatasets.ts`.
- **Phase 2 (Tasks 6-10):** Wrapped `App.tsx`'s tree in `PipelineProvider` (memoized
  `athlete` object built from existing `deadliftStance` state). Rewrote
  `usePipelineTotalChartData`, `usePipelineDiagnostics`, `usePipelineRepCalculator` to
  consume the shared context instead of calling `runPipeline` themselves.
  `usePipelineTotalChartData`'s signature shrank from 6 params to 2 (`dateRange`, `unit`);
  its only caller (`SigmaTab.tsx`, and `App.tsx`'s call site) was updated to match.
  `usePipelineDiagnostics`/`usePipelineRepCalculator` aren't wired into any component yet
  (that's blocked/pending Tasks 13/11) so their signature changes were safe.
- **Phase 3 (Tasks 11-12, the two unblocked component swaps):** `RepCalculator.tsx` swapped
  off `@dyel/core`'s `findBestE1RM`/`buildSessionStats` onto `usePipelineRepCalculator()` +
  `findBestE1RMFromPipeline` (added a `findCanonicalForExercise` helper to
  `packages/app/src/pipeline/repCalculatorUtils.ts`). `StrengthScoreCalculator.tsx` swapped
  off `@dyel/core`'s `calculateMetrics` onto `@dyel/pipeline`'s `computeStrengthScores`
  (one-line change, same signature). Both parity tests stayed at their existing
  assertion tiers (no promotion — divergence not yet fully closed per their migration docs).
- **Phase 4 (Tasks 17-18, docs):** Added an explicit "MVC mapping" section to
  `packages/app/CLAUDE.md` (Model = `runPipelineModel`/`PipelineProvider`; Controller =
  `hooks/pipeline/*` + `pipeline/*.ts` helpers; View = `components/**`, render-only) and
  updated stale references to the old "components call only `runPipeline`" rule. Added a
  preamble note to `MIGRATION_PLAN.md` that all remaining component migrations must land on
  the new shared-context infrastructure. Fixed two stale doc references left over
  (`RepCalculator.tsx`'s table entry, and a mention that `ConjugateCharts` was migrated when
  it isn't) during final review.

**Tasks 13-16 remain intentionally un-implemented** (blocked on external, pre-existing
issues, not part of this session's scope):

- Task 13: `DiagnosticsPanel.tsx` swap — blocked on issue #461 / `GAPS_REMAINING.md` 5d-5h.
- Task 14: `ConjugateCharts.tsx` swap — blocked on issue #459 (normalization divergence).
- Task 15: `VariationRadarChart.tsx` swap — blocked on issue #460, depends on Task 14.
- Task 16: `LiftTabPanel.tsx`'s `filterByDateRange` removal — blocked on Tasks 13-15.
  Each has a fully-specified target file + swap approach in the plan doc, ready to execute the
  moment its blocker closes.

## Decisions Made & Rationale

- **Split point is `buildDataset`, not the whole pipeline.** Confirmed by reading
  `dataset/build.ts`: `ui.dateRange` filters points _before_ forward-fill/combine for
  composite specs, so a full-range single run + post-hoc trim would NOT be equivalent to
  running with the date range applied up front. Parse/tag/normalize/diagnose/points-by-deriver
  run once (cheap enough to always compute for every deriver, ~6-id registry); `buildDataset`
  runs per-view with that view's own `specs`+`ui`.
- **`PipelineModel` computes points for every registered deriver**, not just ones referenced
  in a `specs` array — since there's no `specs` param at the shared-model stage anymore.
- **No directory rename** (`pipeline/` stays `pipeline/`, not `views/`/`selectors/`) — the
  existing per-file `CLAUDE.md` convention already documents intent, and renaming would churn
  every open migration doc/issue reference (#459-#461) for no functional gain. Explicitly
  documented as a "don't do this" in `packages/app/CLAUDE.md`.
- **No new root `ARCHITECTURE.md`** — the MVC statement was folded into the existing
  `packages/app/CLAUDE.md`, matching the repo's per-package-CLAUDE.md convention.
- **Git commit policy correction mid-session:** an early feature-implementer subagent (Task 3) made an unauthorized commit (`003d1d5`, contains the `useResolvedRawInput` work) despite
  no request to commit. User explicitly said to leave that commit as-is but told every
  subsequent subagent not to commit — all Task 4-18 changes are correctly sitting uncommitted
  in the working tree as of session end, per that instruction. **This session's own final
  commit (see below) is the first authorized commit since `003d1d5`.**
- **Parity test tiers left unchanged** for `RepCalculator`/`StrengthScoreCalculator` — their
  migration docs don't claim divergence is fully closed, so promoting soft-warn assertions to
  hard-assert wasn't done (would risk false failures on known residual gaps).

## Open TODOs

1. **Resume Tasks 13-16 as their blockers close** (external issues #461, #459, #460 — not
   part of this session, tracked separately in `GAPS_REMAINING.md`/`migration/*.md`). Full
   swap instructions are in the plan doc; no further scoping needed once unblocked.
2. Nothing else from this session's plan is outstanding — Tasks 1-12, 17-18 are complete and
   verified. The task tracker (IDs 1-18) reflects this; Tasks 13-16 are `pending` with
   `blockedBy` unmet.
3. Consider whether to squash/organize the working-tree changes (Tasks 4-18, currently one
   big uncommitted diff) into more granular commits before this lands on `main` — this
   session made one commit covering all of it (see below) per the user's implicit go-ahead
   pattern, but hasn't been asked whether a different commit granularity is preferred.

## Files Touched

**Pipeline package:**

- `packages/pipeline/src/pipeline.ts` — added `PipelineModel`, `runPipelineModel`,
  `buildDatasetsFromModel`; `runPipeline` now a thin wrapper
- `packages/pipeline/src/pipeline.test.ts` — added parity test
- `packages/pipeline/src/index.ts` — exported the three new symbols

**App package — new files:**

- `packages/app/src/context/PipelineContext.tsx` + `.test.tsx` — `PipelineProvider`/`usePipelineModel()`
- `packages/app/src/hooks/pipeline/usePipelineDatasets.ts` + `.test.ts` — per-view selector
- `packages/app/src/hooks/pipeline/index.ts`, `CLAUDE.md` — barrel/docs for the hooks dir
- `packages/app/src/utils/rawInputUtils.ts` (`useResolvedRawInput` added) + `.test.ts`

**App package — modified:**

- `packages/app/src/App.tsx` — wrapped tree in `PipelineProvider`, memoized `athlete`
- `packages/app/src/components/pages/SigmaTab.tsx` — updated call to match new hook signature
- `packages/app/src/components/shared/RepCalculator.tsx` — swapped onto pipeline-native path
- `packages/app/src/components/shared/StrengthScoreCalculator.tsx` — swapped onto `computeStrengthScores`
- `packages/app/src/hooks/pipeline/usePipelineTotalChartData.ts` — onto shared context
- `packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts` — onto shared context
- `packages/app/src/hooks/pipeline/usePipelineRepCalculator.ts` — onto shared context
- `packages/app/src/pipeline/repCalculatorUtils.ts` — added `findCanonicalForExercise`
- `packages/app/src/pipeline/repCalculatorParity.test.ts` — fixed a call signature
- `packages/app/CLAUDE.md` — added MVC mapping section, updated boundary-rule wording

**Docs:**

- `MIGRATION_PLAN.md` — preamble note requiring remaining migrations to use shared-context infra

**Also present in working tree, not touched this session** (pre-existing from before, listed
for completeness): `.claude/agents/feature-implementer.md`, `.claude/agents/team-lead.md`,
`.claude/skills/handoff/SKILL.md`, deleted `SPECIFICATIONS.md`, `migration/LiftTabPanel.md`,
`package-lock.json`, untracked `.agents/`, `.codex/`, `AGENTS.md`.

## Suggested Next Skills

- No specific skill needed — next session should just check `GAPS_REMAINING.md`/issues
  #459/#460/#461 for status, and if any have closed, resume the corresponding blocked task
  (13/14/15/16) using the target files and approach already specified in
  `/Users/kasittig/.claude/plans/let-s-move-more-towards-refactored-adleman.md`.
