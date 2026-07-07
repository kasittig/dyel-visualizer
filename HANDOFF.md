# HANDOFF — ConjugateCharts normalization-divergence scoping + partial fix (Phase 4 blocker)

## Context

`migration-phase-1` is a feature branch implementing `MIGRATION_PLAN.md`'s pipeline-native
migration of `packages/app` components off `@dyel/core` onto `@dyel/pipeline`. Phases 1-3 were
already complete going into this session. This session began Phase 4's first blocker:
`ConjugateCharts`, which was migrated to `@dyel/pipeline` once and then deliberately reverted
(`46f267f`) after its parity test (`conjugateChartParity.test.ts`) found real legacy-vs-pipeline
normalization divergence. Full task tracking lives in `SPECIFICATIONS.md`'s newest section
("ConjugateCharts normalization divergence"); full root-cause detail lives in
`migration/ConjugateCharts.md`'s "Scoping session (2026-07-07)" section.

## Progress Overview

- **Root-caused the divergence into 4 concrete findings** (re-verified directly against code and
  live test runs, not just relayed from old `HANDOFF.md` history):
  1. Speed-work filtering asymmetry — pipeline excluded speed-work sets from normalization
     fitting; legacy has no such concept at all.
  2. minSamples gating — initially flagged as a gap, but re-investigation found production
     already hardcodes `MIN_SAMPLES = 1` (`pipeline.ts`), matching legacy's effective `n >= 1`
     requirement. **Not actually a live divergence source** — downgraded during scoping.
  3. Canonical vs. displayName grouping granularity (the largest gap) — legacy groups by exact
     logged string, pipeline by canonical slug; zero per-variation vocabulary overlap on the real
     fixture for all three lift types.
  4. Normalized-series "no date overlap" anomaly — reproducing live, unexplained.
- **Fixed finding #1**: removed the `effortOnly` filter from `fitNormalizationModel`
  (`packages/pipeline/src/derive/normalize.ts`) so it fits against unfiltered records, matching
  legacy exactly. `derivers.ts`'s separate per-day `isSpeedWork` e1RM-derivation usage was
  explicitly left untouched (different concern, affects every pipeline chart).
- **Fixed finding #3**: added an opt-in `groupBy: 'label'` field to `SeriesSpec`
  (`packages/pipeline/src/dataset/build.ts`) and a parallel `buildPointsByLabel` construction path
  in `runPipeline` (`packages/pipeline/src/pipeline.ts`) that groups by `r.meta?.rawExercise`
  (already preserved on every `TaggedSetRecord`, previously never read) instead of canonical.
  Wired into `packages/app/src/pipeline/conjugateChartSpecs.ts`'s `variations` spec only (the
  `normalized` composite spec is intentionally unaffected — composites should aggregate across
  variants). This closed the previously-empty per-variation intersection: real matched series
  now compare directly on the fixture (`Box Squat`, `Bench (American Bar)`,
  `Bench (American Bar, CG)`, `Deadlift (opposite)`).
- **Deliberately did not promote any newly-matched series to hard-assert** — sample sizes are
  n=1–2 per series, and `missingInA` is still nonzero for squat/deadlift even with matching
  labels. Left as soft-warn, consistent with existing project precedent (Session 4 only promoted
  deadlift baseline _identity_ once robustly confirmed exact; numeric fitting divergence stays
  permanent soft-warn).
- **Did NOT swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` back onto `@dyel/pipeline`** —
  this session narrowed the divergence but never attempted the actual component swap. The
  components still import from `@dyel/core` at runtime today.
- Corrected a stale doc claim: `MIGRATION_PLAN.md` previously said `ConjugateCharts.md` was
  "fully migrated" (leftover from before the `46f267f` revert) — now accurately reflects current
  status and links to the scoping doc.
- Full verification at every step was independently re-run via `qa-reviewer` from ground truth
  (not trusted from `feature-implementer` self-reports) — this project has a documented history
  of subagents misreporting test counts, confirmed again this session (one agent claimed
  "35 files / 519 tests" for `packages/pipeline`; ground truth was 12 files / 188 tests. The
  actual code diff was correct despite the wrong self-reported numbers).

## Decisions Made & Rationale

- **A-2 (speed-work): match legacy exactly, drop pipeline's filter** — user's explicit choice
  over keeping pipeline's methodologically-arguably-better exclusion. Implemented as scoped.
- **B-1 (grouping): add a parallel label-grouped construction path** rather than accept coarser
  canonical-based UX for `ConjugateCharts` — user's explicit choice, preserves today's per-variant
  chart granularity without a user-visible regression. `Point.series`'s "canonical id" contract
  now has one narrow, documented, opt-in exception (`groupBy: 'label'`) — updated
  `packages/pipeline/CLAUDE.md` and `packages/pipeline/src/dataset/CLAUDE.md` to reflect this.
- **No hard-assert promotion** — explicit call not to over-claim parity from n=1–2 sample sizes,
  even though 0% diff was observed on those samples. `missingInA` nonzero on 2 of 4 matched
  series means date-level divergence still exists beneath the now-matching vocabulary.
- **Cleaned up a stray `test_output.txt`** (3581-line raw vitest dump) left in the repo root by
  one of the verification passes — matches a previously-documented pattern in this repo's own
  history of subagents leaving scratch log files; deleted, not committed.

## Open TODOs

1. **Root-cause why `missingInA` is still nonzero** for squat ("Box Squat") and deadlift
   ("Deadlift (opposite)") now that labels match between legacy and pipeline — not investigated,
   don't assume a cause without checking.
2. **Root-cause finding #4** (normalized-series "no date overlap", squat/bench/deadlift all
   affected) — completely untouched by this session's fixes, likely but not confirmed to be a
   downstream symptom of the same label/grouping story played out differently for the
   `normalized` composite spec.
3. **Actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto `@dyel/pipeline`** — not
   started. Per `migration/ConjugateCharts.md`'s "Before re-attempting" note, should not be
   attempted before at least assessing items 1-2 above, since they represent residual,
   unquantified divergence risk.
4. Once ConjugateCharts is actually swapped (or a decision is made to defer it further),
   `MIGRATION_PLAN.md` Phase 4's other two blockers (`VariationRadarChart`, `DiagnosticsPanel`)
   still need the same "real pipeline-side work" treatment before `LiftTabPanel.md` can proceed.
5. `.claude/skills/handoff/SKILL.md` still shows as modified in `git status` (uncommitted,
   pre-existing, unrelated to this session's work) — not touched or investigated here, same as
   every prior handoff.

## Files Touched

- `packages/pipeline/src/derive/normalize.ts` (removed `effortOnly` speed-work filter)
- `packages/pipeline/src/derive/normalize.test.ts` (updated for inclusion, not exclusion)
- `packages/pipeline/src/dataset/build.ts` (new opt-in `groupBy: 'label'` field on `SeriesSpec`)
- `packages/pipeline/src/pipeline.ts` (new `buildPointsByLabel` + lazy label-grouped points map)
- `packages/pipeline/src/pipeline.test.ts` (new `groupBy: 'label'` coverage)
- `packages/app/src/pipeline/conjugateChartSpecs.ts` (`variations` spec now `groupBy: 'label'`)
- `packages/pipeline/CLAUDE.md` (documented the `Point.series` label-grouping exception)
- `packages/pipeline/src/dataset/CLAUDE.md` (documented `groupBy: 'label'` in `SeriesSpec` section)
- `MIGRATION_PLAN.md` (corrected stale "fully migrated" `ConjugateCharts` claim)
- `migration/ConjugateCharts.md` (scoping findings + final outcome sections)
- `SPECIFICATIONS.md` (new tracking section for this work)
- `HANDOFF.md` (this file)
- Deleted (uncommitted scratch, not tracked): `test_output.txt`

## Suggested Next Skills

- None required immediately. If resuming this work, start with Open TODO #1 or #2
  (root-causing the two residual anomalies) before attempting Open TODO #3 (the actual component
  swap) — swapping before understanding residual divergence risks reintroducing exactly the bug
  that motivated the original `46f267f` revert.
