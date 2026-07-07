# HANDOFF — ConjugateCharts Finding #5 closed via `e1rm-max-effort` deriver (Phase 4 blocker)

## Context

`migration-phase-1` is a feature branch implementing `MIGRATION_PLAN.md`'s pipeline-native
migration of `packages/app` components off `@dyel/core` onto `@dyel/pipeline`. `ConjugateCharts`
is Phase 4's first blocker: it was migrated to `@dyel/pipeline` once, then deliberately reverted
(`46f267f`) after its parity test (`conjugateChartParity.test.ts`) found real legacy-vs-pipeline
normalization divergence. Full task tracking lives in `SPECIFICATIONS.md`'s "ConjugateCharts
normalization divergence" section; full root-cause/outcome detail lives in
`migration/ConjugateCharts.md`.

This session picked up Open TODO #1 from the prior handoff: root-cause (and, per explicit user
direction mid-session, fix) the residual `missingInA` nonzero gaps that remained after a prior
session's fixes for Findings #1 (speed-work filtering) and #3 (canonical/label grouping).

## Progress Overview

- **Root-caused a new divergence, Finding #5: day-level effort/volume filtering asymmetry.**
  Legacy's `splitByEffort` (`packages/app/src/utils/appDataUtils.ts`) completely drops "volume"
  days (`sets > 1 && rpe === null`) before `buildVariationChartData` ever runs. Pipeline's `e1rm`
  deriver never drops a day — it falls back to computing an e1RM from speed-work sets when a day
  has no max-effort set. Confirmed exactly against the real fixture (`Box Squat`'s 1 extra
  pipeline date, `Deadlift (opposite)`'s 2 extra pipeline dates matched the reported
  `missingInA=1`/`=2` precisely) and independently re-verified via `qa-reviewer` before writing
  anything up.
- **User explicitly directed a fix** (not just further root-causing): "implement a day level 'max
  effort' concept. workouts should be either 'max effort' or 'dynamic effort', depending if they
  have a max set or not."
- **Implemented and shipped the fix**, split across 3 delegated passes, each independently
  re-verified via `qa-reviewer` (not trusted from self-reports, per this project's documented
  history of subagents misreporting numbers):
  1. New `'e1rm-max-effort'` deriver id in `packages/pipeline/src/derive/derivers.ts` — reuses
     the existing `isSpeedWork` predicate, returns `null` (not a fallback value) for a day with
     no max-effort sets. The existing `e1rm` deriver is byte-for-byte unchanged (other
     already-migrated charts depend on its current fallback behavior; a pre-existing test locks
     that in). `pipeline.ts`'s `buildPoints`/`buildPointsByLabel` now drop groups whose deriver
     returns `null` instead of constructing a zero/null point. `CompositeSpec.derive`
     (`dataset/build.ts`) widened from the literal `'e1rm'` to `string` so composite specs can
     opt into other deriver ids; `pipeline.ts`'s composite-dataset branch now looks up
     `pointsByDeriver.get(s.derive)` generically instead of hardcoding `e1rmPoints`.
  2. Wired `packages/app/src/pipeline/conjugateChartSpecs.ts`'s `variations` AND `normalized`
     specs to `'e1rm-max-effort'` (both, not just `variations` — legacy's
     `buildVariationChartData` computes both its per-variation series and its normalized
     composite from the same `maxEffort`-filtered rows).
  3. **Found and fixed a separate, pre-existing bug** while investigating an odd side effect
     (deadlift's matched-variation name changed after the fix): `conjugateChartParity.test.ts`'s
     `pipelineVariationKeys` only read `Object.keys(pipeline.variations[0])` — the first row's
     keys, not the union across all rows — so the "matched variation" intersection check was
     only ever accidentally comparing one arbitrary variation per lift type. Fixed to
     `pipeline.variations.flatMap((row) => Object.keys(row))`.
- **Final verified result, much stronger than originally scoped**: every matched per-variation
  series across squat/bench/deadlift now shows `missingInA=0, missingInB=0` — full date-level
  parity. Remaining `maxAbsDiff`/`maxRelDiff` (≤1.1% on a few bench/deadlift series) is
  pre-existing, already-documented rounding divergence, not a new finding. All three `normalized`
  composites now have matching legacy/pipeline point counts (squat 4/4, bench 22/22,
  deadlift 12/12), though the "no date overlap" warning itself still fires — Finding #4
  (normalized-series date-value-alignment) is narrowed (counts align) but **not resolved**; its
  root cause (why the actual date values still don't overlap despite matching counts) remains
  open and is now the clear top-priority remaining item.
- **No regressions**: full suite green — `packages/pipeline` 12 files/195 tests,
  `packages/app` 19 files/200 tests (both builds clean), independently re-verified via
  `qa-reviewer` at every checkpoint, not self-reported.
- **Did NOT** promote any newly-matching series to hard-assert (soft-warn preserved, per
  established project precedent — sample sizes are n=1-5 per series, still judged too sparse to
  call proven parity even at 0% diff).
- **Did NOT** attempt the actual `ConjugateCharts.tsx`/`useConjugateChartData.ts` component swap
  onto `@dyel/pipeline` — still on `@dyel/core` at runtime. Deliberately deferred, same as prior
  sessions, pending Finding #4.

## Decisions Made & Rationale

- **New deriver id, not a modified `e1rm`** — `e1rm-max-effort` was added alongside the existing
  `e1rm` rather than changing `e1rm`'s behavior directly. Changing `e1rm` itself would have
  changed behavior for every other already-migrated pipeline chart (TotalChart, SessionBarChart,
  SigmaChart, DateLineChart) that depends on its current fallback semantics, and broken an
  existing test that explicitly locks in that fallback. This follows the same "narrow, opt-in
  exception" pattern established by the prior session's `groupBy: 'label'` fix.
- **Wired into both `variations` and `normalized` specs** — verified from legacy's actual code
  (`buildVariationChartData`) that both are computed from the same `maxEffort`-filtered rows;
  scoping the fix to `variations` only (as the prior session's label-grouping fix did, for
  different reasons) would have been inconsistent with legacy here.
- **Fixed the test-harness bug rather than accepting the confusing side effect** — when
  deadlift's matched variation name changed after the deriver fix, investigated directly (ran
  the pipeline standalone outside the test) before assuming either a regression or a coincidence.
  Confirmed `Deadlift (opposite)`'s data was intact and correct; the harness itself had a latent
  bug unrelated to correctness of the deriver fix. Fixing it was a small, clearly-scoped
  improvement that also made the final reported parity numbers exhaustive rather than
  accidental — did not want to hand off numbers built on a harness known to be undercounting.
- **Still not promoting to hard-assert** despite 0%-diff, 0-gap results across the board — kept
  consistent with this project's established precedent (documented in `migration/ConjugateCharts.md`)
  of requiring larger sample sizes before hard-asserting parity, even when observed numbers look
  perfect.
- **Every step independently re-verified via `qa-reviewer`** (separate from the
  `feature-implementer` agents that made the changes) before being written into docs — this
  project has documented history of subagents misreporting test counts; ground-truth
  verification caught nothing wrong this session, but the practice was followed rigorously.

## Open TODOs

1. **Root-cause Finding #4**: normalized-series "no date overlap" anomaly. Point counts now match
   exactly between legacy and pipeline (squat 4/4, bench 22/22, deadlift 12/12) after this
   session's fix, but `diffSeries`/`joinChartPointsByDate` still reports zero comparable dates
   for all three lift types — meaning the actual date VALUES still don't align even though the
   counts do. Not investigated this session beyond confirming it's unchanged/narrowed. This is
   the clear next priority — full detail and hypothesis space in `migration/ConjugateCharts.md`'s
   "Finding #4" sections.
2. **Actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto `@dyel/pipeline`** — not
   started. Per `migration/ConjugateCharts.md`'s "Before re-attempting" note, should not be
   attempted before Finding #4 is at least assessed.
3. Once ConjugateCharts is actually swapped (or a decision is made to defer it further),
   `MIGRATION_PLAN.md` Phase 4's other two blockers (`VariationRadarChart`, `DiagnosticsPanel`)
   still need the same "real pipeline-side work" treatment before `LiftTabPanel.md` can proceed.
4. `.claude/skills/handoff/SKILL.md` still shows as modified in `git status` (uncommitted,
   pre-existing, unrelated to this session's work) — not touched or investigated here, same as
   every prior handoff.

## Files Touched

- `packages/pipeline/src/derive/derivers.ts` (new `'e1rm-max-effort'` deriver; `e1rm` unchanged)
- `packages/pipeline/src/derive/derivers.test.ts` (new coverage for `'e1rm-max-effort'`)
- `packages/pipeline/src/pipeline.ts` (null-exclusion in `buildPoints`/`buildPointsByLabel`;
  composite branch now uses `pointsByDeriver.get(s.derive)` generically)
- `packages/pipeline/src/pipeline.test.ts` (new coverage: null-exclusion behavior, composite spec
  respecting `spec.derive`)
- `packages/pipeline/src/dataset/build.ts` (`CompositeSpec.derive` widened from literal `'e1rm'`
  to `string`)
- `packages/app/src/pipeline/conjugateChartSpecs.ts` (`variations` and `normalized` specs now use
  `derive: 'e1rm-max-effort'`)
- `packages/app/src/pipeline/conjugateChartParity.test.ts` (fixed `pipelineVariationKeys` to union
  keys across all rows, not just row 0)
- `migration/ConjugateCharts.md` (Finding #5 root-cause + fix outcome, full real parity numbers)
- `SPECIFICATIONS.md` (Task 6b marked complete, Status section updated)
- `HANDOFF.md` (this file)

## Suggested Next Skills

- None required immediately. If resuming this work, start with Open TODO #1 (root-causing
  Finding #4's date-value-alignment anomaly) before attempting Open TODO #2 (the actual
  component swap) — same reasoning as every prior session: swapping before understanding
  residual divergence risks reintroducing the bug that motivated the original `46f267f` revert.
