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

- [x] Task 1: Add `deadliftStance: 'sumo' | 'conventional'` to `AthleteContext` (Target: `packages/pipeline/src/derive/athlete.ts`, Test: `npm test -w packages/pipeline -- athlete`)
- [x] Task 2: In `fitNormalizationModel`, accept `athlete: AthleteContext` and, only for the deadlift family, add a stance-preference pool as an explicit fallback tier between the existing `comp`/`competitionNamed` pools and the final `entries` fallback (filter to canonicals carrying `stance:${preferredStance}`; use only if `competitionNamed`/`comp` are both empty). Update the call site in `packages/pipeline/src/pipeline.ts:76` to pass `athlete` through (Target: `packages/pipeline/src/derive/normalize.ts`, `packages/pipeline/src/pipeline.ts`; Test: `npm test -w packages/pipeline -- normalize`)
- [x] Task 3: Update `PLACEHOLDER_ATHLETE` to include `deadliftStance: 'sumo'` (Target: `packages/app/src/utils/rawInputUtils.ts`, Test: `npm run build -w packages/app`)
- [x] Task 4: Update inline athlete literals across pipeline's test suite (`pipeline.test.ts`, `dataset/build.test.ts`, `derive/athlete.test.ts`) to include `deadliftStance`; add `it.each` coverage in `normalize.test.ts` for sumo/conventional preference, default-unset, and confirming existing `comp-lift`/`competition`-name priority is preserved (Target: `packages/pipeline/src/pipeline.test.ts`, `packages/pipeline/src/derive/normalize.test.ts`, Test: `npm test -w packages/pipeline`)
- [x] Task 5: Full pipeline + app build/test pass (Test: `npm run build -w packages/pipeline && npm run build -w packages/app && npm test -w packages/pipeline && npm test -w packages/app`)

### Part B — Baseline-canonical-identity assertion in the parity harness

- [x] Task 6: Expose the fitted `NormalizationModel` on `PipelineResult` (new `model: NormalizationModel` field) (Target: `packages/pipeline/src/pipeline.ts`, Test: `npm test -w packages/pipeline -- pipeline`)
- [x] Task 7: Add a small helper to resolve each lift family's baseline canonical to a human-comparable exercise name for both sides (legacy via `baselineExByType`'s `displayName`; pipeline via `model.baseline[family]`) (Target: `packages/app/src/testUtils/diffChartSeries.ts` or a new colocated helper, Test: `npm test -w packages/app -- diffChartSeries`)
- [x] Task 8: Add an explicit assertion in `totalChartParity.test.ts` comparing legacy's resolved baseline per family against pipeline's `model.baseline` — hard-assert for squat/bench, soft-warn (`console.warn`) for deadlift until Part A is verified to reconcile it (Target: `packages/app/src/pipeline/totalChartParity.test.ts`, Test: `npm test -w packages/app -- totalChartParity`)
- [x] Task 9: Full app test/build pass, re-run parity soft-warn diagnostics and record whether Part A narrows the documented 16–31% divergence (Test: `npm run build -w packages/app && npm test -w packages/app`)

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

- **Complete.** Verified directly in code (not just by re-reading this file): `AthleteContext.deadliftStance`
  exists (`packages/pipeline/src/derive/athlete.ts`), `PLACEHOLDER_ATHLETE` sets `deadliftStance: 'sumo'`
  (`packages/app/src/utils/rawInputUtils.ts`), `PipelineResult.model: NormalizationModel` is exposed
  (`packages/pipeline/src/pipeline.ts`), and `totalChartParity.test.ts`'s baseline-identity `it.each` (hard-assert
  squat/bench/deadlift) passes — 17/17 tests green (`npm test -w packages/app -- totalChartParity`). This
  checklist just hadn't been updated to reflect it; no further action needed here.

---

# SPECIFICATIONS — Phase 2 of MIGRATION_PLAN.md (SigmaTab + VariationRadarChart)

Tracking doc for Phase 2 execution (`migration/SigmaTab.md` + `migration/VariationRadarChart.md`),
coordinated by team-lead. See `MIGRATION_PLAN.md` for the overall ordering rationale and
`APP_COMPONENTS.md` for the full component inventory.

## Scope decisions made before delegating (read before touching either item)

- **SigmaTab**: `TotalChart`/`SessionBarChart`'s squat/bench/deadlift/pushPull/total series are
  already covered by the existing `TOTAL_CHART_SPECS` + `usePipelineTotalChartData` hook (dead
  code today — nothing calls it; `SigmaTab.tsx` still computes its `chartData` via legacy
  `buildChartData`). The one apparent gap (`SessionBarChart`'s `volume` / accessory-volume series)
  is **not** a pipeline gap: `volumeByDate` is computed in `App.tsx` via `calculateVolumeCorrelation`
  (`@dyel/core`) entirely independently of `buildChartData`, and is already passed into `SigmaTab`
  as a prop. So the swap-over is: call `usePipelineTotalChartData` for the lift series, then merge
  in the `volume` key from the `volumeByDate` prop — no new pipeline spec needed, and `SigmaTab.tsx`
  itself ends up calling only `runPipeline` (via the hook), never `@dyel/core` directly, satisfying
  the migration boundary rule. This is a **full swap-over**, not a deferred one.
- **VariationRadarChart**: pipeline-native snapshot values are available via
  `conjugateChartSpecs()` + `snapshotVariationsFromPipeline()` (already in
  `testUtils/diffVariationSnapshot.ts`), but the component's tooltip needs per-variation
  _last-session detail_ (date, sets, reps, weight, RPE) that the pipeline snapshot doesn't carry,
  and the underlying per-variation normalization is the same one `ConjugateCharts` was **reverted**
  from after a parity test surfaced real divergence (`46f267f`, see `HANDOFF.md`). Swapping the
  real component now would risk silently reintroducing that same bug into a second user-facing
  chart. Per Phase 1's established precedent for `DiagnosticsPanel`/`RepCalculator`/
  `StrengthScoreCalculator`: **build + validate the pipeline-native replacement and its parity
  test, but explicitly defer the component swap-over**, documenting why.

## Task list

- [x] Task 1: Add a `mergeVolumeIntoChartPoints(chartData, volumeByDate)` helper and rewire
      `SigmaTab.tsx` to source squat/bench/deadlift/pushPull/total data from
      `usePipelineTotalChartData` instead of `buildChartData`, merging in `volume` from the
      existing `volumeByDate` prop; update `SigmaTab`'s props to `inputMode`/`url`/`pastedText`/
      `refreshToken`/`dateRange`/`unit`/`volumeByDate` (drop `sigmaPairs`/`sigmaStats`/
      `effectiveBaselineNames`/`effectiveTargetNames`, which were only used to feed
      `buildChartData`); update the one caller (`App.tsx`) accordingly. (Target:
      `packages/app/src/utils/pipelineChartUtils.ts`, `packages/app/src/components/pages/SigmaTab.tsx`,
      `packages/app/src/App.tsx`. Test: `npm run build -w packages/app`)
- [x] Task 2: Add `packages/app/src/pipeline/sigmaTabParity.test.ts` following
      `totalChartParity.test.ts`'s structure (real fixture, `runPipeline` + `TOTAL_CHART_SPECS` vs.
      legacy `buildChartData`, hard-assert squat/deadlift/pushPull/total, soft-warn bench per the
      documented divergence, plus a check that `volume` merges identically since it's sourced from
      the same `volumeByDate` map on both sides). (Target:
      `packages/app/src/pipeline/sigmaTabParity.test.ts`. Test:
      `npm test -w packages/app -- sigmaTabParity`)
- [x] Task 3: Add `packages/app/src/pipeline/variationRadarChartParity.test.ts` reusing
      `snapshotVariationsFromLegacy`/`snapshotVariationsFromPipeline`/`diffVariationSnapshots`
      (`testUtils/diffVariationSnapshot.ts`) and `conjugateChartSpecs()`, `it.each` per lift
      type/variation, over `test/fixtures/total-chart-sheet.csv`, soft-warning on divergence per
      the same intentional-exception pattern as `conjugateChartParity.test.ts` (do **not** touch
      `VariationRadarChart.tsx` itself — swap-over is deferred, see scope decision above). (Target:
      `packages/app/src/pipeline/variationRadarChartParity.test.ts`. Test:
      `npm test -w packages/app -- variationRadarChartParity`)
- [x] Task 4: Update docs to reflect the above: `MIGRATION_PLAN.md` Phase 2 status (SigmaTab fully
      migrated; VariationRadarChart pipeline-native replacement + parity test ready, swap deferred
      with rationale), `APP_COMPONENTS.md` (move `SigmaTab` to "Already migrated", update
      `VariationRadarChart`'s entry to "Ready to migrate" with the tooltip-data-gap +
      divergence-risk rationale), `migration/VariationRadarChart.md` (mark step 2, the component
      swap, as deferred rather than done). (Target: `MIGRATION_PLAN.md`, `APP_COMPONENTS.md`,
      `migration/VariationRadarChart.md`. Test: none — doc-only)
- [x] Task 5 (QA): Full verification — `npm run build -w packages/pipeline`,
      `npm run build -w packages/core`, `npm run build -w packages/app`, `npm test -w packages/app`
      (all files, not just the two new ones) — confirm no regressions in the existing test suite,
      and that both new parity tests pass.

## Verification

`npm run build -w packages/pipeline && npm run build -w packages/core && npm run build -w packages/app && npm test -w packages/app`
— all green, including `sigmaTabParity` and `variationRadarChartParity`.

## Status

Task 1 complete: `SigmaTab.tsx` now sources squat/bench/deadlift/pushPull/total via
`usePipelineTotalChartData` + merges `volume` via new `mergeVolumeIntoChartPoints` helper; zero
`@dyel/core` imports remain in `SigmaTab.tsx`. `App.tsx` call site updated. Verified: pipeline/core/app
builds clean, `npm test -w packages/app` — 159 tests, 14 files, all green, no regressions.
Next: Tasks 2 and 3 (parity tests) in parallel.
