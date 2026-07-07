# HANDOFF — ConjugateCharts Finding #4 closed (test-harness bug); new Finding #6 opened

## Context

`migration-phase-1` is a feature branch implementing `MIGRATION_PLAN.md`'s pipeline-native
migration of `packages/app` components off `@dyel/core` onto `@dyel/pipeline`. `ConjugateCharts`
is Phase 4's first blocker: it was migrated to `@dyel/pipeline` once, then deliberately reverted
(`46f267f`) after its parity test (`conjugateChartParity.test.ts`) found real legacy-vs-pipeline
normalization divergence. Full task tracking lives in `SPECIFICATIONS.md`'s "ConjugateCharts
normalization divergence" section; full root-cause/outcome detail lives in
`migration/ConjugateCharts.md`.

This session picked up Open TODO #1 from the prior handoff: root-cause Finding #4, the
`normalized` composite's persistent "no date overlap" soft-warn that survived the prior
session's Finding #5 fix (which made legacy/pipeline point counts match exactly for all three
lift types, but the actual date _values_ still supposedly didn't align).

## Progress Overview

- **Root-caused Finding #4 by direct evidence, not speculation.** Before touching any code,
  wrote a standalone debug script (temp test file, deleted after use) that printed the real
  legacy and pipeline `normalized` date arrays for squat side by side. They were byte-identical
  (`2026-02-02`, `2026-03-02`, `2026-06-08`, `2026-06-22` on both sides) — proving the "no date
  overlap" warning was never describing a real data problem. This immediately falsified the
  handoff's leading hypothesis (Finding #5's day-level effort asymmetry contributing to this
  too) and pointed at the test harness itself.
- **Found the actual bug**: `conjugateChartParity.test.ts`'s `beforeAll` renames the pipeline
  composite's output key to `NORMALIZED_KEY` (`__normalized__`) via `if (liftType in point)`,
  based on a comment claiming "Pipeline normalized composite uses liftType as the key." That
  comment was wrong — `conjugateChartSpecs.ts`'s `normalized` spec has `id: 'normalized'`, and
  `packages/pipeline/src/dataset/build.ts`'s composite branch pushes rows keyed by `spec.id`
  (the literal string `'normalized'`), never by `liftType`. So `liftType in point` was always
  `false`, the rename never fired, and every `diffSeries(joined, NORMALIZED_KEY)` call found no
  value on the pipeline side for any date — misreporting "no date overlap" for all three lift
  types regardless of actual alignment. Structurally the same class of defect as the
  `pipelineVariationKeys` row-0-only bug fixed in the prior session (a test-harness key/shape
  mismatch, not a data problem).
- **Fixed via delegated `feature-implementer` pass**: changed the condition to
  `if ('normalized' in point)` and corrected the two stale comments. One file touched:
  `packages/app/src/pipeline/conjugateChartParity.test.ts` (5-line change). Independently
  re-verified via `qa-reviewer` (separate agent from the one that made the change), per this
  project's documented history of subagents misreporting numbers.
- **Real, unmasked result**: squat's `normalized` composite is now exact parity
  (`compared=4 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%`). But unmasking the real
  comparison revealed bench and deadlift genuinely do NOT match: bench
  `maxRelDiff=9.8%`, deadlift `maxRelDiff=5.1%` — real, previously-unmeasurable divergence that
  was always in the data, just invisible behind the false "no overlap" warning. This is a new
  open item, **Finding #6**, not yet root-caused.
- **QA verification caught a wrinkle worth flagging for future sessions**: the first
  `qa-reviewer` run reported 2 failing test files (`diagnosticsPanelParity.test.ts`,
  `strengthScoreCalculatorParity.test.ts`, `ReferenceError: __MODIFIER__EFFECTS__`/
  `__COEFFICIENTS__` not defined) in a full-suite run. Investigated directly rather than trusting
  either report blindly: ran those two files standalone (both passed, 13/13), then reran a full
  clean `npm run build` (pipeline+core+app) followed by `npm test -w packages/pipeline` and
  `npm test -w packages/app` from a fresh shell — both fully green, matching the documented
  baseline exactly (pipeline 12 files/195 tests, app 19 files/200 tests). Concluded the 2
  failures were a non-reproducing environment/isolation flake specific to that one `qa-reviewer`
  invocation, not caused by this session's change and not a real regression. Flagging this
  pattern (rather than silently ignoring it) in case it recurs for a future session — if it does,
  it's worth investigating whether some vitest run mode/pool setting is fragile around
  build-time-injected globals (`__MODIFIER__EFFECTS__`, `__COEFFICIENTS__`).
- **No regressions**: full suite green — `packages/pipeline` 12 files/195 tests,
  `packages/app` 19 files/200 tests (both builds clean), identical counts to the pre-session
  baseline (only the 5-line harness fix, no new test files).
- **Did NOT** investigate Finding #6 (bench/deadlift normalized-composite value divergence) —
  flagged as the clear next priority, not attempted this session.
- **Did NOT** attempt the actual `ConjugateCharts.tsx`/`useConjugateChartData.ts` component swap
  onto `@dyel/pipeline` — still on `@dyel/core` at runtime. Deliberately deferred, same as every
  prior session, now pending Finding #6 instead of Finding #4.

## Decisions Made & Rationale

- **Verified the anomaly with a throwaway debug script before touching any real code** — given
  this project's repeated pattern of subagents/test harnesses misreporting numbers, confirmed
  the actual date values matched (not just point counts) before forming a root-cause hypothesis.
  This caught that the leading hypothesis in the prior handoff (Finding #5 contributing to
  Finding #4) was wrong, saving a wasted investigation down that path.
- **Delegated the fix to `feature-implementer`, verification to a separate `qa-reviewer`** —
  consistent with this project's established practice of not trusting subagent self-reports;
  the QA pass's numbers were independently re-confirmed by rerunning the same commands directly
  when its full-suite run showed unexpected failures, rather than either accepting or dismissing
  them without investigation.
- **Investigated the QA flake instead of silently discarding it** — rather than assuming the
  2 failing files reported by `qa-reviewer` were "probably nothing," ran them standalone and
  reran the full suite from a clean build to confirm they were non-reproducing before writing
  up a "no regressions" conclusion. Documented the pattern in case it's a real intermittent issue
  worth someone's attention later.
- **Did not attempt Finding #6 this session** — root-causing it needs its own investigation
  (likely per-variant normalization-factor fitting or canonical/label grouping differences
  feeding the composite differently than the per-variation series, per
  `migration/ConjugateCharts.md`'s notes, but unconfirmed) and this session was scoped to
  closing out Finding #4 specifically, per the prior handoff's explicit instruction to solve
  Open TODO #1.

## Open TODOs

1. **Root-cause Finding #6**: bench (9.8%) and deadlift (5.1%) `normalized` composite value
   divergence from legacy, while squat is exact (0%). Not investigated this session beyond
   confirming the real numbers via `qa-reviewer`. This is the clear next priority — full detail
   in `migration/ConjugateCharts.md`'s new "Finding #4 resolved" section.
2. **Actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto `@dyel/pipeline`** —
   not started. Should not be attempted before Finding #6 is at least assessed, per
   `migration/ConjugateCharts.md`'s "Before re-attempting" note (same reasoning as every prior
   session — swapping before understanding residual divergence risks reintroducing the bug that
   motivated the original `46f267f` revert).
3. Once ConjugateCharts is actually swapped (or a decision is made to defer it further),
   `MIGRATION_PLAN.md` Phase 4's other two blockers (`VariationRadarChart`, `DiagnosticsPanel`)
   still need the same "real pipeline-side work" treatment before `LiftTabPanel.md` can proceed.
4. `.claude/skills/handoff/SKILL.md` still shows as modified in `git status` (uncommitted,
   pre-existing, unrelated to this session's work) — not touched or investigated here, same as
   every prior handoff.
5. If a future session sees flaky `ReferenceError: __MODIFIER__EFFECTS__`/`__COEFFICIENTS__ is
not defined` failures in `diagnosticsPanelParity.test.ts`/`strengthScoreCalculatorParity.test.ts`
   during a full-suite run that don't reproduce standalone or on a rerun, this session hit the
   same thing once and couldn't reproduce it after a clean rebuild — worth a closer look if it
   keeps happening, but not investigated further here since it never reproduced.

## Files Touched

- `packages/app/src/pipeline/conjugateChartParity.test.ts` (fixed the `normalized`-composite
  key-rename condition from `liftType in point` to `'normalized' in point`; corrected two stale
  comments)
- `migration/ConjugateCharts.md` (Finding #4 root-cause + fix outcome + new Finding #6, full
  real parity numbers)
- `SPECIFICATIONS.md` (Task 7 marked complete, new Task 9 added for Finding #6, Status section
  updated)
- `HANDOFF.md` (this file)

## Suggested Next Skills

- None required immediately. If resuming this work, start with Open TODO #1 (root-causing
  Finding #6's bench/deadlift normalized-composite value divergence) before attempting Open
  TODO #2 (the actual component swap) — same reasoning as every prior session: swapping before
  understanding residual divergence risks reintroducing the bug that motivated the original
  `46f267f` revert.
