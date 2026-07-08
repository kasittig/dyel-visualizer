# HANDOFF — Design C shipped (addlWtOffset weight-space correction), residual TotalChart divergence narrowed further

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` components off `@dyel/core` onto `@dyel/pipeline`. Full task tracking lives in
`SPECIFICATIONS.md`; full ConjugateCharts root-cause/outcome detail lives in
`migration/ConjugateCharts.md`.

This session picked up the prior handoff's residual finding: Design B (previous session) fixed
`addlWtOffset` wiring into pipeline normalization but only narrowed, not closed, `TotalChart`'s
bench/deadlift/total divergence (7.0%/2.7%/1.8%) — because Design B mirrored legacy's
`findBestE1RM` (an e1RM-space approximation built for `RepCalculator`), not legacy's actual
`TotalChart` data path (`normalizeToBaseE1RM`, a weight-space, per-set correction).

## Progress Overview

- **Root-caused the space/granularity mismatch** via direct code reading (not assumption):
  confirmed legacy's `buildChartData`/`buildVariationChartData` correct `addlWtOffset` in
  weight-space, per raw session row, before `calcE1RM` runs — a different mechanism than
  Design B's post-hoc e1RM-space correction. Also confirmed `projectToVariant` has zero
  production callers (narrowed blast radius) and that the fix must be scoped to composite
  specs only (`SeriesSpec` output like ConjugateCharts' `variations` must stay on raw,
  uncorrected e1rm, matching legacy).
- **User signed off on "Design C"** (weight-space mirror, applied pre-derivation).
- **Implemented Design C** (`packages/pipeline/src/derive/normalize.ts`,
  `packages/pipeline/src/pipeline.ts`, `packages/pipeline/src/index.ts`): new exported
  `offsetAdjustRecords(records, model)` applies each addlWt canonical's fitted offset to raw
  `weight` before derivation; `normalizeE1rm`/`projectToVariant` reverted to pure factor
  operations (Design B's e1RM-space correction removed/superseded); `pipeline.ts` resequenced
  so composite specs consume pre-corrected points while series/label specs stay untouched.
- **Caught and fixed two false alarms from automated QA before accepting this as done**
  (established project precedent — don't trust agent self-reports):
  1. An implementer agent claimed "538 tests/35 files" for the pipeline package;
     independently verified (twice) to actually be 207 tests/12 files.
  2. A QA pass reported `TotalChart`'s squat "regressing" 0.0%→0.7%. Traced to team-lead's own
     wrong assumption (conflating ConjugateCharts' squat `normalized` composite, genuinely
     always 0.0%, with `TotalChart`'s own squat series, which the test itself already labels
     "tracked, not yet reconciled"). **Disproven via direct `git stash` bisection** against the
     pre-Design-C tree: squat was already at 0.7% before this session's work — not a
     regression. A defensive `pipeline.ts` rework triggered by chasing this false alarm (reuse
     original points object-identically, splice in only addlWt-affected canonicals instead of
     a second full re-derivation pass) was kept anyway — it's strictly more robust with zero
     behavior change, verified.
- **Real before/after numbers** (`totalChartParity.test.ts`, verified via `git stash`
  bisection):
  | Series | Before | After |
  |---|---|---|
  | squat | 0.7% | 0.7% (unchanged — pre-existing, unrelated to addlWt) |
  | bench | 7.0% | 7.0% (unchanged) |
  | deadlift | 2.7% | **0.6%** (genuine improvement) |
  | pushPull | 2.5% | 2.5% (unchanged) |
  | total | 1.8% | 1.8% (unchanged) |
- **Updated stale documentation**: `totalChartParity.test.ts`'s root-cause comment block still
  claimed speed-work exclusion was live (fixed earlier) and cited GitHub issue #451 as an open
  contributing bug (actually closed, per `migration/ConjugateCharts.md`). Rewrote it to state
  current, accurate status and the genuinely-still-unexplained items (bench's flat 7.0%,
  squat's 0.7%, pushPull's `missingInB`).
- **No regressions**: full suite green — pipeline 12 files/207 tests, app 19 files/200 tests,
  both builds clean, independently re-verified via `qa-reviewer` at each step.

## Decisions Made & Rationale

- **Design C over Design D** (user sign-off) — chose to attempt closing the residual rather
  than accept it, given deadlift's improvement proved the weight-space hypothesis was at least
  partially correct.
- **Kept the defensive `pipeline.ts` rework** even after proving the "regression" it was meant
  to fix wasn't real — it removes a latent fragility (relying on two independent derivation
  passes producing byte-identical output) for a negligible cost, and is fully verified safe.
- **Did not chase bench's flat 7.0%** this session — Design C measurably helped deadlift but
  not bench, meaning some other bench-specific factor is the dominant cause there. Explicitly
  left open rather than guessed at (see Open TODOs).

## Open TODOs

1. **Root-cause bench's flat 7.0% divergence** (both `TotalChart` and `ConjugateCharts`) —
   Design C didn't move it despite bench having addlWt (chain) canonicals. Not yet
   investigated; the cause is unknown (do NOT assume it's GitHub issue #451 — that's closed).
2. **Root-cause squat's 0.7% divergence** and **pushPull's `missingInB=6`** — both pre-existing,
   unrelated to addlWt, not yet investigated at all.
3. **ConjugateCharts Task 8**: actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts`
   onto `@dyel/pipeline` — still not started, still on `@dyel/core` at runtime. Per-variation
   soft-warns remain not promoted to hard-assert (n=1-5 samples, too sparse).
4. Once ConjugateCharts is swapped (or deferred further), `MIGRATION_PLAN.md` Phase 4's other
   two blockers (`VariationRadarChart`, `DiagnosticsPanel`) still need the same treatment.

## Files Touched

- `packages/pipeline/src/derive/normalize.ts` (Design C: `offsetAdjustRecords` added,
  `normalizeE1rm`/`projectToVariant` reverted to pure factor ops)
- `packages/pipeline/src/pipeline.ts` (resequenced fit/derive ordering; composite specs
  consume pre-corrected points)
- `packages/pipeline/src/index.ts` (export `offsetAdjustRecords`)
- `packages/pipeline/src/derive/CLAUDE.md` (documented `offsetAdjustRecords`, Design C
  superseding Design B/Task 10b)
- `packages/pipeline/src/derive/normalize.test.ts`, `packages/pipeline/src/pipeline.test.ts`,
  `packages/pipeline/src/dataset/build.test.ts` (new/updated test coverage)
- `packages/pipeline/test/fixtures/pipeline-design-c-addlwt.csv` (new fixture, reps > 1 to
  prove weight-space vs e1RM-space divergence)
- `packages/app/src/pipeline/totalChartParity.test.ts` (updated stale root-cause comment)
- `SPECIFICATIONS.md` (Design C task list fully checked off, real numbers recorded)
- `HANDOFF.md` (this file)

Note: `.claude/agents/team-lead.md` also shows modified in `git status` but was not touched
this session (pre-existing, unrelated) — not included in this handoff's commit.

## Suggested Next Skills

- None required immediately. If resuming this work, start with Open TODO #1 (bench's flat
  7.0% divergence) — it's the most actionable unexplained item, with the numeric data already
  in hand from this session's verified parity runs.
