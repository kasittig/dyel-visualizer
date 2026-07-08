# HANDOFF — legacy fit-window alignment + root-cause investigation

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. This session executed
`LEGACY_MIGRATION.md`'s task list (aligning legacy's normalization-model fit window with
pipeline's) and then investigated why the resulting parity numbers didn't improve as
expected. See `LEGACY_MIGRATION.md` for full task-by-task detail and `GAPS_REMAINING.md`
for the broader per-component migration gap inventory (both still current, not
superseded by this session).

## Progress Overview

- **Landed `LEGACY_MIGRATION.md` Tasks 1-7**: three call sites (`App.tsx`'s
  `sigmaStats`/`baselineExByType`/`targetExByType`, `LiftTabPanel.tsx`'s per-lift-tab
  stats, and both `totalChartParity.test.ts`/`sigmaTabParity.test.ts` harnesses) now fit
  the normalization model on full unfiltered pair history instead of date-range-filtered
  pairs, matching `@dyel/pipeline`'s documented behavior. Rendered/summed values still
  use the date-filtered set everywhere — only fit inputs changed. Full suite (205/205)
  and build green throughout.
- **Task 6 grep surfaced one additional in-scope call site** (`LiftTabPanel.tsx`, not in
  the original blast-radius list) — found, confirmed in-scope, and fixed same session.
- **Investigated why `maxRelDiff` didn't improve** (Task 7's numbers moved the wrong
  direction: squat 16.2%→18.1%, total 16.3%→16.9%, worse). Two experiments:
  1. Reversed the fix direction as a disposable test (scoped pipeline's fit to
     `ui.dateRange` instead of widening legacy) — made things _worse_ in that direction
     too (squat 21.9%, total 18.2%), ruling out fit-window mismatch as the primary driver
     of the 16-25% baseline gap. Reverted cleanly, no trace left.
  2. Diffed the actual fitted models (legacy `buildSessionStats` vs pipeline
     `fitNormalizationModel`) directly. **Found the real cause**: legacy's
     `splitByEffort` (`packages/app/src/utils/appDataUtils.ts`) excludes volume/speed-work
     sessions (`sets === 1 || rpe !== null` gate) before ever reaching the fit; pipeline's
     `fitNormalizationModel` has no equivalent exclusion and fits on the entire tagged
     history. Concretely: squat's `Box Squat` variant fits on `sampleCount=2` (legacy) vs
     `n=3` (pipeline) for the same fixture, producing a ~22% factor gap on its own. This
     also degrades single-sample variants because the _baseline_ grid itself differs the
     same way. This is exactly the "speed-work filtering" cause already named (but never
     quantified) in `packages/app/CLAUDE.md`'s divergence writeup.

## Decisions Made & Rationale

- **Matched legacy to pipeline's full-unfiltered-history fit window, not the reverse** —
  pipeline is the target end-state per `MIGRATION_PLAN.md`; this was still correct to land
  even though it didn't close the larger gap, since it removes one real (if secondary)
  source of divergence and keeps legacy consistent with pipeline's documented, intentional
  fit-window behavior.
- **Did not attempt to fix the volume/speed-work filtering asymmetry this session** — it's
  a modeling/design gap (pipeline has no concept of a "volume session" or exclusion filter
  at all), not a mechanical patch. Treated the same way `GAPS_REMAINING.md` §5
  (`DiagnosticsPanel`) treats comparable gaps: propose a pipeline-side change and get
  explicit sign-off before implementing, rather than guessing at a design during this pass.
- **Did not update `GAPS_REMAINING.md`'s §0c/0d/0e checkboxes or `packages/app/CLAUDE.md`'s
  stale divergence numbers** — the root-cause story materially changed this session (from
  "fit-window mismatch" to "volume/speed-work filtering asymmetry"), so those need a full
  re-scoping pass, not a number swap. Per the project's own "verify before documenting done"
  convention.

## Open TODOs

1. **Decide how to close the volume/speed-work filtering gap in `@dyel/pipeline`** — this
   is now the best-evidenced explanation for the persistent 16-25% `maxRelDiff` on
   squat/bench/deadlift/total (`totalChartParity.test.ts`/`sigmaTabParity.test.ts`).
   Needs a design decision (new tag + filter on `TaggedSetRecord`, or pre-filtering
   records before `fitNormalizationModel` the way `ui.dateRange` scopes rendered points
   today) and explicit sign-off before implementation — see `LEGACY_MIGRATION.md`'s
   "Follow-up" section for full detail on the mechanism and the specific fixture rows
   that demonstrate it. (Target: `packages/pipeline/src/derive/normalize.ts` or
   `packages/pipeline/src/pipeline.ts`. Test: `npm test -w packages/app --
totalChartParity sigmaTabParity`, watch `maxRelDiff` drop.)
2. **Re-scope `GAPS_REMAINING.md` §0c/0d/0e** once (1) has a direction — those sections'
   "fit-window mismatch, high confidence" framing is now known to be incomplete/wrong as
   the dominant cause and should be corrected or superseded, not left as-is.
3. **Everything else in `GAPS_REMAINING.md`** is still current and untouched this session:
   `DiagnosticsPanel` (§5, largest remaining item, needs 3 separate design sign-offs),
   `ConjugateCharts`/`VariationRadarChart` swap-overs (§3/§4, blocked on §0/§5-adjacent
   work), `RepCalculator`/`StrengthScoreCalculator` (§2, smallest remaining lift),
   `LiftTabPanel` full swap (§6), `ValidatorPage` scope question (§7), `TotalChart`
   type-only cleanup (§1). See that file directly for task-by-task detail — not
   re-summarized here to avoid drift between two copies of the same list.
4. File a GitHub tracking issue for the volume/speed-work filtering gap (Open TODO #1
   above) once a design direction is picked — no issue filed yet.

## Files Touched

- `LEGACY_MIGRATION.md` (task checkboxes updated, root-cause investigation findings
  appended — this is now the most detailed record of this session's work)
- `packages/app/src/App.tsx` (Tasks 1-2: `sigmaStats`/`baselineExByType`/`targetExByType`
  now fit on unfiltered `sigmaPairs`, not `filteredSigmaPairs`)
- `packages/app/src/components/pages/LiftTabPanel.tsx` (Task 6 follow-up:
  `useLastSessionStats` now takes unfiltered `rows`, not `filteredRows`)
- `packages/app/src/pipeline/totalChartParity.test.ts`,
  `packages/app/src/pipeline/sigmaTabParity.test.ts` (Tasks 3-5: `beforeAll` now fits
  `computeBaselineTargetExercises`/`buildSessionStats` on a hoisted unfiltered
  `allSigmaPairs` local; `buildChartData`'s own rendered-pairs argument untouched)
- No changes to `packages/pipeline/src/pipeline.ts` — the disposable fit-window-reversal
  experiment was fully reverted, confirmed via `git diff` showing zero lines.

## Suggested Next Skills

- Start with Open TODO #1 (design the volume/speed-work filtering fix for
  `@dyel/pipeline`) — this is the actual critical path now, superseding the fit-window
  framing `GAPS_REMAINING.md` currently leads with.
- Once a direction is picked, delegate implementation to `feature-implementer` and
  verification to `qa-reviewer`, same pattern as this session.
