# HANDOFF — ConjugateCharts Finding #6 root-caused (real cause: addlWtOffset never wired into pipeline normalization)

## Context

`migration-phase-1` is a feature branch implementing `MIGRATION_PLAN.md`'s pipeline-native
migration of `packages/app` components off `@dyel/core` onto `@dyel/pipeline`. `ConjugateCharts`
is Phase 4's first blocker: it was migrated to `@dyel/pipeline` once, then deliberately reverted
(`46f267f`) after its parity test (`conjugateChartParity.test.ts`) found real legacy-vs-pipeline
normalization divergence. Full task tracking lives in `SPECIFICATIONS.md`'s "ConjugateCharts
normalization divergence" section; full root-cause/outcome detail lives in
`migration/ConjugateCharts.md`.

This session picked up Open TODO #1 from the prior handoff: root-cause Finding #6, the
`normalized` composite's real (previously invisible, unmasked by the prior session's Finding #4
harness-bug fix) value divergence — squat exact (0%), bench 9.8% `maxRelDiff`, deadlift 5.1%.

## Progress Overview

- **Root-caused Finding #6 by direct empirical evidence, not speculation.** Tested two
  hypotheses via throwaway debug test files (both deleted after use, same pattern as the prior
  Finding #4 session) before writing up a conclusion:
  1. **Canonical-vs-label grouping mismatch** (the leading hypothesis carried over from the
     prior handoff, since `CompositeSpec` has no `groupBy` field and Finding #3's
     `groupBy: 'label'` fix was deliberately scoped only to the `variations` series, never
     the `normalized` composite). **Falsified**: printed the real fixture's label→canonical
     fan-out per lift type — squat (6 canonicals, all 1:1), deadlift (8 canonicals, all 1:1),
     bench (17 canonicals, all 1:1 except one 2-label canonical, `bench-board`). Nowhere near
     enough fan-out to explain a 9.8% composite-wide divergence, and doesn't touch deadlift
     at all (zero fan-out there).
  2. **Baseline-identity mismatch** (i.e., legacy and pipeline picking a different canonical
     as the comp-lift anchor for a family). **Falsified**: printed legacy's
     `effectiveBaselineNames` against pipeline's `model.baseline['lift:<type>']` for all
     three lift types — they agree exactly (squat: `Squat`/`squat`; bench: `Bench
(commands)`/`bench-pause`, the same exercise; deadlift: `Deadlift`/`deadlift`).
  - **Real root cause, confirmed**: `packages/pipeline/src/derive/normalize.ts`'s
    `fitNormalizationModel`/`normalizeE1rm` never wires `addlWtOffset` (the chain/band
    weight correction) into either the per-variant-factor FIT or the per-point normalize
    APPLY step, for any exercise. Legacy (`buildSessionStats`/`normalizeToBaseE1RM` in
    `packages/core`) corrects for it on both sides: fit-time via `applyAddlWtOffset`
    producing offset-adjusted sessions before `fitVariantFactor`, apply-time via explicit
    offset adjustment before dividing by `variantFactor` in `normalizeToBaseE1RM`.
    Pipeline's `NormalizationModel.addlWtOffset` field is computed but never consumed
    anywhere — dead data.
  - **Confirmed this exactly explains the per-lift divergence magnitude**: squat has zero
    addlWt (chain/band) canonicals among its 6 → 0% divergence; deadlift has 3 of 6
    non-baseline canonicals with addlWt → 5.1%; bench has 5 of 16 → 9.8%. The proportion of
    addlWt-carrying variants per lift type tracks the divergence magnitude directly.
- **Not fixed this session** — per this project's established precedent (Findings #1 and #3
  both required explicit user sign-off on the design before implementation), the actual fix
  (how to wire `addlWtOffset` into `fitNormalizationModel`'s fit step and `normalizeE1rm`'s
  apply step) is flagged for sign-off, not implemented speculatively. Note this is a
  **pipeline-level** fix (`packages/pipeline/src/derive/normalize.ts`), not scoped to
  `ConjugateCharts` alone.
- **Did NOT** attempt the actual `ConjugateCharts.tsx`/`useConjugateChartData.ts` component
  swap onto `@dyel/pipeline` — still on `@dyel/core` at runtime. Deliberately deferred, same
  as every prior session, still gated behind Finding #6 (now root-caused, not yet fixed).
- **No regressions**: no production code touched this session — root-cause investigation
  only, via two throwaway debug test files added and then deleted. `npm test -w packages/app
-- conjugateChartParity` unchanged, 8/8 passing.

## Decisions Made & Rationale

- **Tested both hypotheses empirically via throwaway debug scripts before writing anything
  up** — consistent with this project's established pattern (the Finding #4 session did the
  same) of not trusting a plausible-sounding narrative without direct evidence. This caught
  that the leading hypothesis carried over from the prior handoff (canonical/label grouping)
  was wrong, and that a second hypothesis (baseline mismatch) was also wrong, before landing
  on the real cause.
- **Did not attempt a fix this session** — per the project's established precedent that
  normalization-behavior architecture changes (Findings #1 and #3) require explicit user
  sign-off before implementation. The fix is scoped to shared pipeline code
  (`packages/pipeline/src/derive/normalize.ts`), not just `ConjugateCharts`, which raises the
  stakes of getting the design right before touching it.
- **Deleted both debug test files after use** — same convention as every prior root-cause
  session in this migration; they were purely investigative, never meant to be committed.

## Open TODOs

1. **Get explicit sign-off on a fix design for Finding #6**, then implement it (new Task 10
   in `SPECIFICATIONS.md`): wire `addlWtOffset` into `fitNormalizationModel`'s per-variant
   fit (mirroring legacy's `applyAddlWtOffset`-before-`fitVariantFactor` sequencing) and into
   `normalizeE1rm`'s apply step (mirroring legacy's offset-adjusted-e1RM-before-divide-by-factor
   in `normalizeToBaseE1RM`). Full context and the confirmed root-cause writeup are in
   `migration/ConjugateCharts.md`'s new "Finding #6 root-caused" section.
2. **Actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto `@dyel/pipeline`** —
   not started. Should not be attempted before Finding #6 is fixed (not just root-caused),
   per `migration/ConjugateCharts.md`'s "Before re-attempting" note (same reasoning as every
   prior session — swapping before resolving known divergence risks reintroducing the bug
   that motivated the original `46f267f` revert).
3. Once ConjugateCharts is actually swapped (or a decision is made to defer it further),
   `MIGRATION_PLAN.md` Phase 4's other two blockers (`VariationRadarChart`, `DiagnosticsPanel`)
   still need the same "real pipeline-side work" treatment before `LiftTabPanel.md` can proceed.
4. `.claude/skills/handoff/SKILL.md` still shows as modified in `git status` (uncommitted,
   pre-existing, unrelated to this session's work) — not touched or investigated here, same as
   every prior handoff.
5. Consider whether the fix for Finding #6, once designed, should also address
   `TotalChart`'s composite — it has the same latent gap (`addlWtOffset` unused) even though
   no divergence has been observed there yet, since `TotalChart`'s current fixture-tested
   variants may not include addlWt-carrying canonicals. Worth checking before assuming the
   fix is `ConjugateCharts`-only scoped.

## Files Touched

- `migration/ConjugateCharts.md` (new "Finding #6 root-caused" section: both falsified
  hypotheses, the confirmed real root cause, and the per-lift addlWt-proportion evidence)
- `SPECIFICATIONS.md` (Task 9 marked complete with full writeup, new Task 10 added for the
  actual fix, Status section updated)
- `HANDOFF.md` (this file)
- No production code changed. Two throwaway debug test files
  (`packages/app/src/pipeline/_debug_finding6.test.ts`, rewritten once) were created and
  deleted during investigation — nothing left behind.

## Suggested Next Skills

- None required immediately. If resuming this work, start with Open TODO #1 (getting
  explicit sign-off on the `addlWtOffset` wiring design for Finding #6, then implementing it)
  before attempting Open TODO #2 (the actual component swap) — same reasoning as every prior
  session: swapping before resolving known divergence risks reintroducing the bug that
  motivated the original `46f267f` revert.
