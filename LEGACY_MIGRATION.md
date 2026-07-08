# LEGACY_MIGRATION — align legacy `@dyel/core` fit-window with `@dyel/pipeline`

Context: `GAPS_REMAINING.md` §0c/0d root-caused the current squat/bench/deadlift
`maxRelDiff` divergence (16–25% in `totalChartParity.test.ts` /
`sigmaTabParity.test.ts`) to a fit-window mismatch, not `MIN_SAMPLES`:

- **Pipeline** (`packages/pipeline/src/pipeline.ts`, `fitNormalizationModel` call) fits
  `variantFactor`/`addlWtOffset` over the **entire unfiltered** tagged history. Date-range
  scoping (`ui.dateRange`) is applied later, only to which _points_ get rendered
  (`buildDataset`), never to the fit itself.
- **Legacy** (`packages/app/src/App.tsx`) currently fits `buildSessionStats` (which calls
  `fitVariantFactor`/`fitAddlWtOffset` internally) on `filteredSigmaPairs` — pairs already
  restricted to the visible date range (typically last 3 months) — via
  `filterByDateRange(sigmaPairs, dateRange.from, dateRange.to)`.

Decision (see conversation, not yet written to `GAPS_REMAINING.md`): resolve this by
**changing legacy to match pipeline's behavior** (fit on full unfiltered history), not the
reverse. Rationale: pipeline is the target end-state; matching legacy backward would mean
re-introducing an all-time vs. windowed fit difference right as ConjugateCharts/
VariationRadarChart/DiagnosticsPanel migrations are trying to close this exact class of gap
elsewhere.

**Blast radius check already done:** `sigmaStats`/`baselineExByType`/`targetExByType` in
`App.tsx` are consumed ONLY by `competitionTotal` (which feeds `StrengthScoreCalculator`).
`TotalChart` itself is already fully migrated to `usePipelineTotalChartData` and does not
touch this legacy path. `RepCalculator.tsx` already fits on unfiltered pairs
(`tabRows[tab].maxEffort`) and needs no change. This keeps the blast radius small and
well-understood — each task below should stay within it; if a task's target file requires
touching something outside this documented radius, stop and flag it rather than guessing.

**Behavioral note to preserve, not silently drop:** the _fit_ inputs change to unfiltered
history, but the _rendered/summed_ pairs (what actually shows up in `competitionTotal`,
and in the parity tests' `buildChartData` output) must stay on the date-range-filtered set.
Only the fit call's input pairs change — do not also widen `buildChartData`'s own `pairs`
argument, or the rendered date range will silently change too.

## Status (2026-07-08 session)

Tasks 1-5 implemented and verified green (60/60 tests, build clean). **Task 6 surfaced an
additional in-scope call site not covered by the original task list; Task 7's numbers moved
in the opposite direction from what this file's Decision section predicted.** Both are
flagged below per this file's own "stop and flag rather than guess" instruction — no further
edits made pending a decision.

### Task 6 finding: additional in-scope call site

`packages/app/src/hooks/data/useLastSessionStats.ts:15` (called from
`packages/app/src/components/pages/LiftTabPanel.tsx:42`) calls `buildSessionStats(pairs, ...)`
where `pairs` is `LiftTabPanel.tsx`'s `filteredRows = filterByDateRange(rows, dateRange.from,
dateRange.to)` (lines 38-41) — a **date-filtered** array, the same class of bug Tasks 1-2
fixed in `App.tsx`. This is a distinct call site (different hook instance, feeds the per-lift
tab's own session stats, not `sigmaStats`) and was outside the "blast radius check" this file
originally documented (which only covered `App.tsx`'s `sigmaStats`/`baselineExByType`/
`targetExByType` → `competitionTotal`). Not yet fixed — needs an explicit decision on whether
it's in scope for this pass or a separate follow-up, since fixing it touches `LiftTabPanel.tsx`
which wasn't in the original blast-radius list.

Other `buildSessionStats`/`computeBaselineTargetExercises` call sites checked and confirmed
**out of scope** (already unfiltered): `conjugateChartParity.test.ts:39`,
`diagnosticsPanelParity.test.ts:48`, `variationRadarChartParity.test.ts:49`,
`RepCalculator.tsx:72`. No `fitVariantFactor`/`fitAddlWtOffset` call sites found anywhere in
`packages/app/src`.

### Task 7 finding: divergence numbers did NOT uniformly drop

| Lift     | Baseline (pre-fix) | Post Tasks 1-5 | Direction       |
| -------- | ------------------ | -------------- | --------------- |
| squat    | 16.2%              | 18.1%          | **worse**       |
| bench    | 22.1%              | 21.5%          | slightly better |
| deadlift | 25.4%              | 25.4%          | unchanged       |
| total    | 16.3%              | 16.9%          | **worse**       |

This contradicts this file's stated rationale (that matching pipeline's full-unfiltered-history
fit would close the gap). Two are worse, one unchanged, one marginally better — not the
expected uniform improvement.

### Follow-up: LiftTabPanel call site fixed, root cause investigated (2026-07-08, later same session)

**`LiftTabPanel.tsx` call site fixed.** `useLastSessionStats(filteredRows, ...)` (line 42)
→ `useLastSessionStats(rows, ...)`, i.e. the same unfiltered-history fit as `App.tsx`.
`ConjugateCharts`/`VariationRadarChart`/`DiagnosticsPanel` continue to render off
`filteredRows` — only the fit input changed. Full suite (205/205) and build still green.
This doesn't move `totalChartParity`/`sigmaTabParity`'s numbers (that test file never
touches `LiftTabPanel`), but closes the same class of gap on the per-lift tab's own stats.

**Root cause investigated — the fit-window hypothesis (Task 0c in `GAPS_REMAINING.md`) is
NOT the (sole, or even dominant) explanation for the 16-25% `maxRelDiff` gap.** Two
experiments:

1. **Reversed the fix direction as a disposable test**: temporarily made `@dyel/pipeline`'s
   `fitNormalizationModel` call scope `tagged` records to `ui.dateRange` before fitting
   (the literal fix Task 0c proposed, applied to pipeline instead of legacy), re-ran
   `totalChartParity`/`sigmaTabParity`. Result: **numbers got worse in this direction too**
   (squat 21.9%, total 18.2%, both worse than either the pre- or post-Tasks-1-5 state).
   Reverted immediately (`git diff` on `pipeline.ts` confirmed clean before and after).
   If the fit-window mismatch were the real root cause, scoping either side to match the
   other should have converged both toward the same low number — instead both directions
   made things worse, which rules out fit-window mismatch as the primary driver.

2. **Direct model diff** (disposable scratch test, `_scratchDiag.test.ts`, deleted after
   use — not committed): dumped legacy's `variantFactor` map (from `buildSessionStats`)
   against pipeline's `model.variantFactor` for the same fixture. Found the actual cause:
   for squat's `Box Squat` variant, **legacy fits on `sampleCount=2` while pipeline fits on
   `n=3`** — a different number of underlying sessions for the nominally same variant,
   producing wildly different factors (legacy `1.0016` vs pipeline `1.2198`, a ~22% gap on
   its own). Traced to the fixture CSV (`test/fixtures/total-chart-sheet.csv`): three
   `Box Squat` rows (2/2, 2/6, 6/8/2026). The 2/6 row is `5 sets × 5 reps` with no RPE.
   Legacy's `splitByEffort` (`packages/app/src/utils/appDataUtils.ts:23-38`) classifies a
   session as `maxEffort` only if `sets === 1 || rpe !== null`; this row fails both, so it's
   bucketed into `volume` and **never reaches `buildSessionStats` at all** — legacy only
   ever fits on `tabRows.squat.maxEffort`. `@dyel/pipeline`'s `fitNormalizationModel` has
   **no equivalent volume/speed-work exclusion** — it fits on the entire tagged history,
   5×5 row included. This is exactly the "speed-work filtering" cause already named (but
   never quantified with concrete numbers) in `packages/app/CLAUDE.md`'s "Handling known
   divergence" section. A secondary, smaller compounding effect: even a single-sample
   variant (`Belt Squat (narrow stance)`, `sampleCount`/`n` = 1 on both sides) still gets a
   different factor (legacy `0.795` vs pipeline `1.158`), because the _baseline_ grid
   itself differs the same way — legacy's `Squat` baseline sessions are already
   `maxEffort`-filtered (volume-work squat sessions excluded), while pipeline's baseline
   canonical grid includes every tagged `squat` session, volume work included — so even
   matched single-sample variants get predicted against a different baseline curve.

**Conclusion:** the elevated 16-25% `maxRelDiff` baseline predates this session and is
substantially explained by this max-effort/volume-work filtering asymmetry, not by the
fit-window difference `GAPS_REMAINING.md` §0c flagged as "high confidence." Tasks 1-5 of
this file were still worth landing (they correctly align legacy with pipeline's _documented,
intentional_ full-unfiltered-history fit-window behavior, and Task 6's `LiftTabPanel` fix
closes a real, distinct gap), but they were never going to close this larger gap, and their
small negative movement (squat/total getting worse) is likely fit-window-direction noise
riding on top of the much larger, still-open volume-filtering asymmetry.

**Not fixed as part of this pass** — this is a modeling/design decision, not a mechanical
fix: `@dyel/pipeline` has no concept of "volume/speed-work session" at all (no tag, no
filter), so replicating legacy's `sets === 1 || rpe !== null` heuristic requires either (a)
a new pipeline-side tag/filter applied before `fitNormalizationModel`, or (b) passing
pre-filtered records into the fit the way `ui.dateRange` scoping does today for rendered
points — either is a real pipeline change needing sign-off, consistent with how
`GAPS_REMAINING.md` §5 (`DiagnosticsPanel`) already treats "propose a pipeline change, get
sign-off" as the right shape for gaps like this, not a same-session mechanical patch.

Do not update `GAPS_REMAINING.md`'s §0c/0d/0e checkboxes or `packages/app/CLAUDE.md`'s stale
divergence numbers based on this session's results — the underlying root cause just changed
substantially and needs a full re-scoping pass, not a number swap.

## Tasks

- [x] Task 1: In `App.tsx`, change `useLastSessionStats`'s first argument from
      `filteredSigmaPairs` to `sigmaPairs` (the full, unfiltered array already computed a
      few lines above at the `sigmaPairs` `useMemo`). Do not change any other argument, and
      do not change the `buildChartData(...)` call a few lines below — it must keep using
      `filteredSigmaPairs`. (Target: `packages/app/src/App.tsx`. Test: `npm run build -w
  packages/app`)
- [x] Task 2: In `App.tsx`, change `useBaselineTargetExercises`'s first argument from
      `filteredSigmaPairs` to `sigmaPairs`, for the same reason as Task 1 (baseline/target
      exercise identity should be resolved from full history, matching how
      `fitNormalizationModel` picks baseline canonicals in `@dyel/pipeline`). Do not change
      any other argument to this hook, and do not change the `buildChartData(...)` call's
      `filteredSigmaPairs` argument. (Target: `packages/app/src/App.tsx`. Test: `npm run
  build -w packages/app`)
- [x] Task 3: In `packages/app/src/pipeline/totalChartParity.test.ts`'s `beforeAll`, change
      the `computeBaselineTargetExercises(...)` call's first argument from `filteredSigma`
      to the unfiltered `[...tabRows.squat.maxEffort, ...tabRows.bench.maxEffort,
  ...tabRows.deadlift.maxEffort]` array (the same expression already used earlier in the
      file to compute `last`/`filteredSigma` — inline it or hoist to a local const,
      whichever keeps the diff smallest). Do NOT change the `buildChartData(...)` call's
      `filteredSigma` argument — it must keep controlling which dates get compared. (Target:
      `packages/app/src/pipeline/totalChartParity.test.ts`. Test: `npm test -w packages/app
  -- totalChartParity`)
- [x] Task 4: In the same `beforeAll` block, change the `buildSessionStats(...)` call's
      first argument from `filteredSigma` to the same unfiltered pairs array used in Task 3.
      (Target: `packages/app/src/pipeline/totalChartParity.test.ts`. Test: `npm test -w
  packages/app -- totalChartParity`)
- [x] Task 5: Apply the identical change to `packages/app/src/pipeline/sigmaTabParity.test.ts`'s
      `beforeAll`: both the `computeBaselineTargetExercises(...)` call (line ~85-89) and the
      `buildSessionStats(...)` call (inside the `buildChartData(...)` call, line ~96) should
      take the unfiltered `[...tabRows.squat.maxEffort, ...tabRows.bench.maxEffort,
  ...tabRows.deadlift.maxEffort]` array instead of `filteredSigma`. Do NOT change
      `buildChartData`'s own first argument (`filteredSigma`) or the `volumeByDate`/`ui`
      construction. (Target: `packages/app/src/pipeline/sigmaTabParity.test.ts`. Test: `npm
  test -w packages/app -- sigmaTabParity`)
- [x] Task 6: Grep the full `packages/app/src` tree for any other call sites of
      `buildSessionStats`, `computeBaselineTargetExercises`, `fitVariantFactor`, or
      `fitAddlWtOffset` that pass a date-filtered pairs array (i.e., anything derived from
      `filterByDateRange(...)`), beyond the four already identified in Tasks 1-5. If any are
      found, list them and stop — do not silently change them without confirming they're in
      scope; report back instead of editing. (Target: none — read-only verification task.
      Test: `grep -rn "buildSessionStats\|computeBaselineTargetExercises\|fitVariantFactor\|fitAddlWtOffset" packages/app/src --include=*.ts --include=*.tsx`)
- [x] Task 7: Run the full app test suite and build after Tasks 1-5 land, and report the
      live `maxRelDiff`/`missingInA`/`missingInB` console.warn output for squat, bench,
      deadlift, and total from both `totalChartParity.test.ts` and
      `sigmaTabParity.test.ts` (they log via `console.warn`, use `npx vitest run` with no
      `--silent` flag, or check test output directly). Compare against today's baseline
      (squat 16.2%, bench 22.1%, deadlift 25.4%, total 16.3%) — confirm the numbers dropped,
      and do not just check that tests still pass, since these are soft-warn assertions that
      pass regardless of the numeric value. (Target: none — verification only. Test: `npm
  test -w packages/app -- totalChartParity sigmaTabParity && npm run build -w
  packages/app`)

## Not in scope for this pass

- Updating `GAPS_REMAINING.md`'s §0c/0d/0e checkboxes and `packages/app/CLAUDE.md`'s stale
  divergence numbers — deferred until Task 7's numbers are confirmed, per the existing
  "verify before documenting done" convention in this repo.
- `RepCalculator.tsx` — already fits on unfiltered pairs, confirmed no change needed.
- Any change to `packages/pipeline/src/pipeline.ts` itself — this pass moves legacy to
  match pipeline, not the other direction from `GAPS_REMAINING.md`'s original Task 0c
  framing. Do not touch pipeline code as part of this file's tasks.
