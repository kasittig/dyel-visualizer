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

---

# SPECIFICATIONS — Phase 3 of MIGRATION_PLAN.md (SessionBarChart + SigmaChart + DateLineChart)

Tracking doc for Phase 3 execution (`migration/SessionBarChart.md` + `migration/SigmaChart.md` +
`migration/DateLineChart.md`), coordinated by team-lead. See `MIGRATION_PLAN.md` for ordering
rationale and `APP_COMPONENTS.md` for the full component inventory.

## Scope decisions made before delegating

- All three components are presentation-only shells with **no independent aggregation logic** —
  unlike `TotalChart`/`ConjugateCharts`/`SigmaTab`, their migration is a pure `@dyel/core` boundary
  cleanup (type-only `ChartPoint` import + `formatDate` relocation), not a normalization/aggregation
  reimplementation. Confirmed directly in code:
  - `SessionBarChart.tsx`: imports `formatDate` + `ChartPoint` from `@dyel/core`.
  - `SigmaChart.tsx`: imports only the `ChartPoint` type from `@dyel/core`.
  - `DateLineChart.tsx`: imports `formatDate` + `ChartPoint` from `@dyel/core`.
- `ChartPoint` already has a `@dyel/pipeline` export (`packages/pipeline/src/dataset/build.ts`,
  re-exported from `packages/pipeline/src/index.ts`) — used already by `TotalChart.tsx`. No new
  pipeline work needed, just switching the three remaining import sites.
- `formatDate` needs relocating exactly once (shared by `SessionBarChart.tsx` and
  `DateLineChart.tsx`) to a new `formatChartDate` helper in
  `packages/app/src/utils/pipelineChartUtils.ts` (already the home for `ChartPoint`-adjacent
  app-level helpers), preserving `@dyel/core`'s exact tick-formatting behavior (`str: string =>
string`, short month/day/2-digit-year). Named distinctly from the existing (unrelated)
  `Date => string` `formatDate` in `utils/dateUtils.ts` to avoid confusion/collision.
- Per each migration doc, none of the three new parity tests should reimplement a legacy-vs-pipeline
  diff — `sessionBarChartParity.test.ts` is a lightweight regression check (via
  `compareChartSeries`) on `SigmaTab`'s already-validated pipeline-derived `ChartPoint[]`
  (squat/bench/deadlift/volume), `sigmaChartParity.test.ts` a thinner consumer check (last-value
  squat/bench/deadlift), and `dateLineChartParity.test.ts` a smoke/regression check across the
  shell's real consumers (`TotalChart`'s full series set + `SigmaTab`'s Σ line). All three reuse
  `sigmaTabParity.test.ts`'s fixture-loading pattern (`total-chart-sheet.csv` + `runPipeline` +
  `TOTAL_CHART_SPECS`) rather than inventing new fixtures or diff helpers.

## Task list

- [x] Task 1: Add `formatChartDate` to `packages/app/src/utils/pipelineChartUtils.ts` (relocated
      from `@dyel/core`'s `formatDate`, same behavior); update `SessionBarChart.tsx` and
      `DateLineChart.tsx` to import `ChartPoint` from `@dyel/pipeline` and use `formatChartDate` as
      the axis tick formatter; update `SigmaChart.tsx`'s `ChartPoint` import to `@dyel/pipeline`.
      Confirm zero `@dyel/core` imports remain in all three files. (Target:
      `packages/app/src/utils/pipelineChartUtils.ts`,
      `packages/app/src/components/charts/SessionBarChart.tsx`,
      `packages/app/src/components/charts/SigmaChart.tsx`,
      `packages/app/src/components/charts/DateLineChart.tsx`. Test:
      `npm run build -w packages/app`)
- [x] Task 2: Add `packages/app/src/pipeline/sessionBarChartParity.test.ts` — lightweight regression
      test using `compareChartSeries` over `SigmaTab`'s pipeline-derived `ChartPoint[]` (squat/
      bench/deadlift/volume), following `sigmaTabParity.test.ts`'s fixture-loading setup. (Test:
      `npm test -w packages/app -- sessionBarChartParity`)
- [x] Task 3: Add `packages/app/src/pipeline/sigmaChartParity.test.ts` — thin consumer test
      asserting last-value squat/bench/deadlift via `compareChartSeries` over the same
      pipeline-derived fixture data. (Test: `npm test -w packages/app -- sigmaChartParity`)
- [x] Task 4: Add `packages/app/src/pipeline/dateLineChartParity.test.ts` — smoke/regression check
      (via `compareChartSeries`) confirming `TotalChart`'s full series set and `SigmaTab`'s Σ line
      still render identical `ChartPoint[]` shapes post-migration. (Test:
      `npm test -w packages/app -- dateLineChartParity`)
- [x] Task 5: Update docs: `MIGRATION_PLAN.md` (Phase 3 status section), `APP_COMPONENTS.md`
      (move `SessionBarChart`/`SigmaChart`/`DateLineChart` from "Not yet migrated" to "Already
      migrated"), this file's Status section. (Target: `MIGRATION_PLAN.md`, `APP_COMPONENTS.md`,
      `SPECIFICATIONS.md`. Test: none — doc-only)
- [ ] Task 6 (QA): Full verification — `npm run build -w packages/pipeline`,
      `npm run build -w packages/core`, `npm run build -w packages/app`, `npm test -w packages/app`
      (all files, not just the three new ones) — confirm no regressions and all three new parity
      tests pass.

## Verification

`npm run build -w packages/pipeline && npm run build -w packages/core && npm run build -w packages/app && npm test -w packages/app`
— all green, including `sessionBarChartParity`, `sigmaChartParity`, and `dateLineChartParity`.

## Status

Tasks 1-5 complete. `formatChartDate` added to `pipelineChartUtils.ts`;
`SessionBarChart.tsx`/`SigmaChart.tsx`/`DateLineChart.tsx` all have zero remaining
`@dyel/core` references. Three new parity tests added (`sessionBarChartParity.test.ts`,
`sigmaChartParity.test.ts`, `dateLineChartParity.test.ts`) — all lightweight
sanity/regression checks per the scope decision above (no legacy diff reimplemented).
`MIGRATION_PLAN.md`/`APP_COMPONENTS.md` updated. Verified: `npm test -w packages/app` —
19 test files, 200 tests, all green (up from 16 files/181 tests before Phase 3), no
regressions. Task 6 (independent QA re-verification) next.

---

# SPECIFICATIONS — ConjugateCharts normalization divergence (Phase 4 blocker scoping)

Tracking doc for the first Phase 4 blocker from `MIGRATION_PLAN.md` — `ConjugateCharts`
was migrated to `@dyel/pipeline` once, then deliberately reverted (`46f267f`) after
`conjugateChartParity.test.ts` surfaced real legacy-vs-pipeline normalization divergence.
Full root-cause + outcome writeup lives in `migration/ConjugateCharts.md`'s "Scoping
session (2026-07-07)" section — this is the task-tracking summary.

## Scope decisions made (user sign-off)

- **Speed-work filtering (A):** drop pipeline's `effortOnly` exclusion in
  `fitNormalizationModel` to match legacy's unfiltered fitting exactly (legacy has no
  speed-work concept at all).
- **Canonical/displayName grouping (B):** add a parallel points-by-label construction
  path (opt-in `groupBy: 'label'` on `SeriesSpec`) rather than accept a coarser,
  user-visible UX change — preserves today's per-exact-variant chart granularity.

## Tasks

- [x] Task 1: Correct stale "fully migrated" claim for `ConjugateCharts` in
      `MIGRATION_PLAN.md`'s Phase 1 status section. (Target: `MIGRATION_PLAN.md`. Test:
      none — doc-only)
- [x] Task 2: Write root-cause scoping findings into `migration/ConjugateCharts.md`
      (speed-work asymmetry, minSamples gating, canonical/label grouping mismatch,
      normalized-series date-overlap anomaly). (Target: `migration/ConjugateCharts.md`.
      Test: none — doc-only)
- [x] Task 3 (A): Remove `effortOnly` speed-work filter from `fitNormalizationModel`
      fitting; update `normalize.test.ts` to reflect inclusion instead of exclusion.
      (Target: `packages/pipeline/src/derive/normalize.ts`. Test:
      `npm test -w packages/pipeline -- normalize`)
- [x] Task 4 (B): Add opt-in `groupBy: 'label'` to `SeriesSpec` + `buildPointsByLabel`
      construction path in `runPipeline`; wire into `conjugateChartSpecs.ts`'s
      `variations` spec. (Target: `packages/pipeline/src/dataset/build.ts`,
      `packages/pipeline/src/pipeline.ts`, `packages/app/src/pipeline/conjugateChartSpecs.ts`.
      Test: `npm test -w packages/app -- conjugateChartParity`)
- [x] Task 5: Document final outcome in `migration/ConjugateCharts.md` (what was fixed,
      real verified numbers, explicit non-promotion-to-hard-assert decision, residual
      open items). (Target: `migration/ConjugateCharts.md`. Test: none — doc-only)
- [x] Task 6: Root-cause the residual `missingInA` nonzero gaps on newly-matched
      variation series (squat/deadlift). **Root-caused (2026-07-07 follow-up), confirmed
      against ground truth and the raw fixture, NOT fixed** — new Finding #5: day-level
      effort/volume filtering asymmetry. Legacy's `splitByEffort`
      (`packages/app/src/utils/appDataUtils.ts`) drops entire "volume" days
      (`sets > 1 && rpe === null`) before `buildVariationChartData` runs; pipeline's
      `derivers.ts` `e1rm` deriver never drops a day (falls back to speed-work sets when
      no effort sets exist), and `conjugateChartSpecs.ts` has no day-level effort filter
      at all. Confirmed exactly against `test/fixtures/total-chart-sheet.csv`: Box Squat's
      1 extra pipeline date (2/6/2026, pure volume) and Deadlift (opposite)'s 2 extra
      pipeline dates (2/6, 3/6, both pure volume) match the reported `missingInA=1`/`=2`
      exactly. Full writeup in `migration/ConjugateCharts.md`'s new "Follow-up session
      (2026-07-07): missingInA root-caused" section. (Target: none this task — root-cause
      only. Test: `npm test -w packages/app -- conjugateChartParity`, unchanged
      8/8 passing, numbers re-verified via `qa-reviewer`)
- [x] Task 6b: Closed Finding #5 by adding a day-level "max-effort" deriver
      (`'e1rm-max-effort'` in `packages/pipeline/src/derive/derivers.ts`, implemented by a
      teammate) mirroring legacy's `splitByEffort` — filters to max-effort sets via the
      existing `isSpeedWork` predicate and returns `null` (day excluded, not zero-filled) when
      a day has none, instead of `e1rm`'s fallback-to-speed-work-sets behavior. Wired into
      **both** `conjugateChartSpecs.ts`'s `variations` series spec and its `normalized`
      composite spec (not just `variations`), since legacy's `buildVariationChartData`
      computes both from the same `maxEffort`-filtered rows.
      **Also found and fixed a separate, pre-existing bug** in
      `conjugateChartParity.test.ts` while investigating an apparent side effect: its
      `pipelineVariationKeys` computation only read `Object.keys(pipeline.variations[0])` —
      the first row's keys, not the union across all rows — so the "matched variation"
      intersection check was only ever accidentally comparing one arbitrary variation per
      lift type. Fixed to `pipeline.variations.flatMap((row) => Object.keys(row))`. With
      both fixes in place, **every matched variation across all three lift types now shows
      `missingInA=0, missingInB=0`** (full date-level per-variation parity; remaining
      `maxAbsDiff`/`maxRelDiff` on a few bench/deadlift series, all ≤1.1%, is pre-existing
      rounding-level divergence, not a new finding). Verified via
      `npm test -w packages/app -- conjugateChartParity` (8/8 passing) and independently
      re-confirmed via `qa-reviewer`; full real output archived in
      `migration/ConjugateCharts.md`. All three `normalized` composites now have matching
      legacy/pipeline point counts (squat 4/4, bench 22/22, deadlift 12/12) though the
      "no date overlap" warning itself persists (Finding #4's date-value-alignment root
      cause is still open, not resolved by this fix). No regressions: full suite
      (`npm run build -w packages/pipeline && npm run build -w packages/app && npm test -w
  packages/pipeline && npm test -w packages/app`) green — pipeline 12 files/195 tests,
      app 19 files/200 tests (unchanged from baseline, includes the one-line harness-bug
      fix). (Target: `packages/app/src/pipeline/conjugateChartSpecs.ts`,
      `packages/app/src/pipeline/conjugateChartParity.test.ts`. Test:
      `npm test -w packages/app -- conjugateChartParity`)
- [x] Task 7: Root-cause the normalized-series "no date overlap" anomaly (finding #4).
      **Root-caused and fixed (2026-07-07, third follow-up) as a test-harness bug, NOT a
      real data divergence** — Finding #5's day-level-asymmetry hypothesis was wrong.
      `conjugateChartParity.test.ts`'s `beforeAll` renamed the pipeline composite's output
      key to `NORMALIZED_KEY` via `if (liftType in point)`, but the composite's actual
      `RechartsRow` key is `spec.id` (the literal string `'normalized'`, from
      `conjugateChartSpecs.ts`'s `normalized` spec + `dataset/build.ts`'s
      `rows.push({ t, [spec.id]: ... })`), never `liftType`. The rename never fired, so
      `diffSeries` never found a pipeline-side value on any date, always reporting "no date
      overlap" even when dates were fully aligned (confirmed directly via a standalone debug
      script: squat's pipeline and legacy `normalized` dates were byte-identical all along).
      Fixed to `if ('normalized' in point)`. One file touched:
      `packages/app/src/pipeline/conjugateChartParity.test.ts` (5-line change, comments +
      condition). Verified (`npm test -w packages/app -- conjugateChartParity`, 8/8 passing,
      independently re-confirmed via `qa-reviewer`): squat's `normalized` composite is now
      exact parity (`compared=4 missingInA=0 missingInB=0 maxAbsDiff=0`), but unmasking the
      real comparison revealed bench (9.8% maxRelDiff) and deadlift (5.1% maxRelDiff) DO have
      genuine value divergence on the `normalized` composite — always present in the data,
      just never measurable before this fix. Flagged as new Finding #6, not yet root-caused
      (see `migration/ConjugateCharts.md`). No regressions: full suite green — pipeline 12
      files/195 tests, app 19 files/200 tests, unchanged from baseline. (Target:
      `packages/app/src/pipeline/conjugateChartParity.test.ts`. Test:
      `npm test -w packages/app -- conjugateChartParity`)
- [ ] Task 8 (not started): Actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts`
      back onto `@dyel/pipeline` — this entire session narrowed the divergence but did
      NOT attempt the component swap itself. Should not be attempted before Task 9 (new
      Finding #6, bench/deadlift normalized-composite value divergence) is at least
      assessed, per this doc's "Before re-attempting" note.
- [ ] Task 9 (not started, new): Root-cause Finding #6 — why bench/deadlift `normalized`
      composites show real 5-10% value divergence from legacy while squat is exact. Not
      investigated yet; candidates include per-variant normalization-factor fitting
      differences or canonical-vs-label grouping feeding the composite differently than the
      per-variation series, but unconfirmed.

## Verification

`npm run build -w packages/pipeline && npm run build -w packages/app && npm test -w packages/pipeline && npm test -w packages/app`
— all green (pipeline: 12 files/188 tests; app: 19 files/200 tests), independently
re-verified via `qa-reviewer` (not self-reported) at each step.

## Status

Tasks 1-7 complete. Findings #1 (speed-work asymmetry), #3 (canonical/label grouping, the
largest gap), #5 (day-level effort/volume filtering asymmetry), and now #4 (normalized-series
"no date overlap" anomaly) are all resolved. #2 (minSamples) was found to be a non-issue on
re-investigation. Finding #4 turned out to be a test-harness key-name bug (comparing against
the wrong `RechartsRow` key), not a real data-alignment problem — squat's `normalized`
composite is exact (0% diff) once the harness compares the right key. Unmasking the real
comparison surfaced a genuinely new item, Finding #6: bench (9.8% maxRelDiff) and deadlift
(5.1% maxRelDiff) `normalized` composites show real value divergence, not yet root-caused.
Verified real numbers (`npm test -w packages/app -- conjugateChartParity`, 8/8 passing,
independently re-confirmed via `qa-reviewer`): **every matched per-variation series across
all three lift types now shows `missingInA=0, missingInB=0`** (unchanged from prior session);
`normalized` composites now show real compared/diff numbers instead of a false "no overlap"
(squat exact, bench/deadlift newly-measurable divergence). No regressions: full suite green —
pipeline 12 files/195 tests, app 19 files/200 tests (unchanged from baseline, includes this
session's 5-line harness fix). Parity harness's per-variation soft-warns remain **not**
promoted to hard-assert — sample sizes remain n=1-5 per series, still judged too sparse to
call proven parity by this project's established precedent. `ConjugateCharts.tsx` and
`useConjugateChartData.ts` remain unswapped, still on `@dyel/core` — the Phase 4 blocker is
narrowed further, not closed. Next: Task 9 (Finding #6 root-cause), then Task 8 (component
swap), or pick a different Phase 4 blocker (`VariationRadarChart`/`DiagnosticsPanel`).
