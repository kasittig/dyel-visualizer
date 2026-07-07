# SPECIFICATIONS — deadliftStance athlete preference + baseline-canonical-identity parity assertion

## Context

Investigating the documented TotalChart core-vs-pipeline value divergence (see
`HANDOFF.md`, `totalChartParity.test.ts`) surfaced two related gaps, tracked here as
Part A and Part B:

1. **Deadlift comp-stance is not athlete-configurable in `@dyel/pipeline`.** Legacy
   (`@dyel/core`) resolves competition-stance deadlift via `defaultCompExerciseName`
   (`packages/core/src/utils/lifts/defaultSelections.ts:26-65`), which accepts a
   caller-supplied `deadliftStance: 'sumo' | 'conventional'` as a last-resort filter.
   `AthleteContext` in the pipeline (`packages/pipeline/src/derive/athlete.ts`) has no
   equivalent field, and `fitNormalizationModel`'s baseline selection
   (`derive/normalize.ts`) has no way to know an athlete's declared stance preference —
   a plausible, untested, additional cause of the parity divergence.
2. **The parity harness never asserts the two implementations agree on _which_ exercise
   is the baseline/comp lift** — only on final chart values. `PipelineResult`
   (`packages/pipeline/src/pipeline.ts`) doesn't currently expose the internally-fitted
   `NormalizationModel` (which contains `baseline: Record<family, canonical>`), so
   there's no way for a test to inspect pipeline's baseline choice today.

Full design rationale and default-policy decisions are in
`/Users/kasittig/.claude/plans/what-is-the-source-dapper-sonnet.md`.

**Default policy:** `AthleteContext.deadliftStance` defaults to `'sumo'`; sumo preference
→ sumo is comp stance, anything else → conventional is comp stance — matches legacy's
existing hardcoded default.

## Pre-flight blocker status

**Item 4 (previously flagged): `npm run build -w packages/pipeline` TS2538 in
`src/tag/detect/canonical.ts` (`ADDL_WT_SLUGS` vs. new `ParsedAddlWt` type) —
✅ RESOLVED / non-reproducing, no action needed.**

Verified directly: a clean `npm run build -w packages/pipeline`
(`tsc -p tsconfig.build.json`, including after `rm -rf dist` to rule out stale cache)
exits 0 with zero errors on `integrate-new-pipeline` @ `c3d4887`. Commit `2c72ba8`
("Parse addl-weight magnitude to stop collapsing distinct band/chain loads") already
updated both consumers of `ADDL_WT_SLUGS` (`canonical.ts:35`, `canonical.ts:78`) to
index by `w.kind` (a `ConjugateAddlWt`), never by the richer `ParsedAddlWt` object —
so the type error described never actually occurs in the current tree.
`grep -rn "ADDL_WT_SLUGS" packages/pipeline/src` confirms no other usage sites exist.
Fallback if this ever resurfaces (e.g. after a rebase): ensure all `ADDL_WT_SLUGS[...]`
accesses use `.kind`, not the raw `ParsedAddlWt` object.

Part A/B work below is clear to start; re-confirm with a build run at kickoff in case
state has changed since this check.

## Task list

### Part A — `deadliftStance` on the athlete profile

- [ ] Task 1: Add `deadliftStance: 'sumo' | 'conventional'` to `AthleteContext` (Target: `packages/pipeline/src/derive/athlete.ts`, Test: `npm test -w packages/pipeline -- athlete`)
- [ ] Task 2: In `fitNormalizationModel`, accept `athlete: AthleteContext` and, only for the deadlift family, add a stance-preference pool as an explicit fallback tier between the existing `comp`/`competitionNamed` pools and the final `entries` fallback (filter to canonicals carrying `stance:${preferredStance}`; use only if `competitionNamed`/`comp` are both empty). Update the call site in `packages/pipeline/src/pipeline.ts:76` to pass `athlete` through (Target: `packages/pipeline/src/derive/normalize.ts`, `packages/pipeline/src/pipeline.ts`; Test: `npm test -w packages/pipeline -- normalize`)
- [ ] Task 3: Update `PLACEHOLDER_ATHLETE` to include `deadliftStance: 'sumo'` (Target: `packages/app/src/utils/rawInputUtils.ts`, Test: `npm run build -w packages/app`)
- [ ] Task 4: Update inline athlete literals across pipeline's test suite (`pipeline.test.ts`, `dataset/build.test.ts`, `derive/athlete.test.ts`) to include `deadliftStance`; add `it.each` coverage in `normalize.test.ts` for sumo/conventional preference, default-unset, and confirming existing `comp-lift`/`competition`-name priority is preserved (Target: `packages/pipeline/src/pipeline.test.ts`, `packages/pipeline/src/derive/normalize.test.ts`, Test: `npm test -w packages/pipeline`)
- [ ] Task 5: Full pipeline + app build/test pass (Test: `npm run build -w packages/pipeline && npm run build -w packages/app && npm test -w packages/pipeline && npm test -w packages/app`)

### Part B — Baseline-canonical-identity assertion in the parity harness

- [ ] Task 6: Expose the fitted `NormalizationModel` on `PipelineResult` (new `model: NormalizationModel` field) (Target: `packages/pipeline/src/pipeline.ts`, Test: `npm test -w packages/pipeline -- pipeline`)
- [ ] Task 7: Add a small helper to resolve each lift family's baseline canonical to a human-comparable exercise name for both sides (legacy via `baselineExByType`'s `displayName`; pipeline via `model.baseline[family]`) (Target: `packages/app/src/testUtils/diffChartSeries.ts` or a new colocated helper, Test: `npm test -w packages/app -- diffChartSeries`)
- [ ] Task 8: Add an explicit assertion in `totalChartParity.test.ts` comparing legacy's resolved baseline per family against pipeline's `model.baseline` — hard-assert for squat/bench, soft-warn (`console.warn`) for deadlift until Part A is verified to reconcile it (Target: `packages/app/src/pipeline/totalChartParity.test.ts`, Test: `npm test -w packages/app -- totalChartParity`)
- [ ] Task 9: Full app test/build pass, re-run parity soft-warn diagnostics and record whether Part A narrows the documented 16–31% divergence (Test: `npm run build -w packages/app && npm test -w packages/app`)

## Verification

- `npm test -w packages/pipeline` and `npm test -w packages/app` both green.
- `npm run build -w packages/pipeline` and `npm run build -w packages/app` both clean.
- `totalChartParity.test.ts`'s new baseline-identity assertion passes for squat/bench,
  and either passes or produces a clear soft-warn log for deadlift.
- Manually inspect soft-warn `console.warn` output for `maxRelDiff` across all five
  series before/after this change to confirm whether stance alignment measurably
  narrows the divergence (informational only — no tolerance is asserted per existing
  project convention).

## Status

- Investigation + planning complete (see linked plan file).
- Pre-flight blocker (item 4) confirmed resolved/non-reproducing — see above.
- No tasks started yet. Next step: delegate Task 1 to `feature-implementer`.
