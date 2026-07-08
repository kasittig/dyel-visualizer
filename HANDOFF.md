# HANDOFF — Bench's flat 7.0% divergence fixed (board/block/deficit equipment-magnitude canonical collapsing)

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` components off `@dyel/core` onto `@dyel/pipeline`. Full task tracking lives in
`SPECIFICATIONS.md`; this session's plan also has a standalone copy in `FIX_BOARD_COUNT.md`.

This session picked up the prior handoff's Open TODO #1: bench's flat 7.0% divergence between
legacy (`@dyel/core`) and pipeline (`@dyel/pipeline`) `TotalChart`/`ConjugateCharts` output,
left unexplained after Design C (previous session) measurably helped deadlift but not bench.

## Progress Overview

- **Root-caused via direct code trace + fixture correlation**: `EQUIPMENT_DETECTORS`'s `board`
  entry (`packages/pipeline/src/tag/detect/detectors.ts`) matches any string containing
  `"board"` and discards the numeric count, so `Bench (1 board)` and `Bench (2 board)` both
  resolved to canonical `bench-board`. `fitNormalizationModel` then fit one blended
  `variantFactor` across both board counts, whereas legacy's `buildSessionStats` groups by
  exact `displayName` string and fits them independently. Confirmed via a throwaway debug
  harness (deleted, working tree clean): the three worst-diverging dates in the fixture exactly
  match the three board-press session dates.
- **Audited for similar bugs (Task 1) before scoping the fix**: all 9 `EQUIPMENT_DETECTORS`
  entries checked against real fixture data. Found `block` and `deficit` share the identical
  bug pattern (currently latent — fixture happens to log only uniform heights per modifier, so
  no active divergence, but any future mixed-height session would trigger the same blending
  bug). `box`/`incline`/`decline`/`pause`/`floor`/`rack` had no numeric variants in fixture
  data — excluded from scope. **Decision: generalized the fix to board + block + deficit**
  rather than board-only, since it's the same mechanism at negligible extra cost.
- **Implemented a structural canonical fix**, fully contained to the `tag/detect/` layer (no
  `derive/`/`pipeline.ts` changes needed):
  1. Added `equipmentMagnitude: string | null` to `ParsedExercise`
     (`packages/pipeline/src/tag/detect/conjugate-types.ts`).
  2. Implemented magnitude parsing in `parseExercise.ts`: digit or `"double"` before `"board"`;
     digit (optionally with a `"` inch mark) before `"block"`/`"blocks"` or `"deficit"`;
     defaults to `"1"` when absent.
  3. Wired `equipmentMagnitude` into `buildCanonical`
     (`packages/pipeline/src/tag/detect/canonical.ts`) — appends `-${magnitude}` only when
     non-default, mirroring the existing chains/addlWts omit-default convention. Confirmed
     `buildTagsAndEffects` stays keyed by equipment kind only (unaffected by design).
  4. Extended `canonical.test.ts`'s existing magnitude `it.each` matrix with 9 new rows
     (pipeline test count 207 → 216).
  5. Documented the convention in `packages/pipeline/src/tag/CLAUDE.md`.
- **Caught a suspicious self-report early, per established project precedent**: an implementer
  agent claimed "538 tests/35 files" after Task 2 (a type-only field addition) — the exact same
  false figure a different implementer fabricated in a prior session (real baseline was 207
  tests/12 files). Independently re-verified via `qa-reviewer`: actual state was 207
  tests/12 files (pipeline), 200 tests/19 files (app), matching the true pre-change baseline —
  the claim was false, flagged, and every subsequent task in this session was independently
  QA-verified before proceeding.
- **Real before/after numbers** (`totalChartParity.test.ts` + `conjugateChartParity.test.ts`,
  independently re-verified via `qa-reviewer`):
  | Series | Before | After |
  |---|---|---|
  | squat | 0.7% | 0.7% (unchanged — no equipment-magnitude variants) |
  | bench | 7.0% | **0.7%** (**~10x improvement — confirms root cause**) |
  | deadlift | 0.6% | 0.6% (unchanged — fixture's block/deficit heights are uniform; latent bug closed, not observable on this fixture) |
  | pushPull | 2.5% | **0.3%** (**~8x improvement — downstream ripple from bench's fix**) |
  | total | 1.8% | **0.2%** (**~9x improvement — downstream ripple from bench's fix**) |

  `conjugateChartParity.test.ts` normalized composites: bench 7.0%→**0.7%** (same
  improvement), squat/deadlift unchanged. All hard-assert tests stayed green throughout — no
  tolerances were loosened; these are genuine measured improvements on the existing soft-warn
  series.

- **No regressions**: full suite green — pipeline 12 files/216 tests, app 19 files/200 tests,
  both builds clean, independently re-verified via `qa-reviewer` at every task boundary (not
  just at the end).

## Decisions Made & Rationale

- **Generalized scope to board + block + deficit** (not board-only) after Task 1's audit —
  same bug mechanism, same code location, negligible extra implementation cost, closes two
  latent bugs alongside the one actively causing bench's divergence.
- **Structural canonical fix chosen over mirroring `groupBy: 'label'` into the `variantFactor`
  fit step** — the alternative would be more invasive to `NormalizationModel`'s canonical-keyed
  shape and would need explicit design sign-off the way Designs B/C did. The chosen approach
  needed no `derive/`/`pipeline.ts` changes at all, minimizing blast radius.
- **Independently QA-verified every single task** (not just a final pass) — this session
  caught one false self-report early (Task 2's "538/35" claim) by cross-checking against a
  known project precedent; every subsequent task was verified in the same way before the next
  was delegated, rather than batching verification at the end.

## Open TODOs

1. **Task 10 (final closeout QA)**: an independent full-suite re-verification pass is still
   queued as the last task in this fix's plan, even though every individual task was already
   independently verified as it landed. Purely a formality at this point but not yet run.
2. **Root-cause squat's 0.7% divergence** and **pushPull's residual — now much smaller at
   0.3%/`missingInB=6`** — both pre-existing, unrelated to addlWt or equipment-magnitude, not
   yet investigated. PushPull's improvement (2.5%→0.3%) alongside bench's fix suggests some of
   its divergence may have been board-related too (pushPull likely includes bench in its
   composite) — worth checking before assuming it's a wholly separate issue.
3. **ConjugateCharts Task 8**: actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts`
   onto `@dyel/pipeline` — still not started, still on `@dyel/core` at runtime. Per-variation
   soft-warns remain not promoted to hard-assert (n=1-5 samples, too sparse).
4. Once ConjugateCharts is swapped (or deferred further), `MIGRATION_PLAN.md` Phase 4's other
   two blockers (`VariationRadarChart`, `DiagnosticsPanel`) still need the same treatment.

## Files Touched

- `packages/pipeline/src/tag/detect/conjugate-types.ts` (`equipmentMagnitude` field added to
  `ParsedExercise`)
- `packages/pipeline/src/tag/detect/parseExercise.ts` (magnitude parsing for board/block/
  deficit)
- `packages/pipeline/src/tag/detect/canonical.ts` (`buildCanonical` appends magnitude suffix
  when non-default)
- `packages/pipeline/src/tag/detect/canonical.test.ts` (9 new `it.each` rows)
- `packages/pipeline/src/tag/CLAUDE.md` (new "Magnitude conventions" subsection)
- `SPECIFICATIONS.md` (this fix's task list fully checked off except Task 10, real numbers
  recorded)
- `FIX_BOARD_COUNT.md` (standalone copy updated to match)
- `HANDOFF.md` (this file)

## Suggested Next Skills

- Run Task 10 (final independent full-suite QA pass) to formally close out this fix.
- If resuming further work, start with Open TODO #2 — pushPull's improvement alongside bench's
  suggests a possible shared cause worth checking before treating it as separate from squat's
  0.7%.
