# HANDOFF: Real parity tests for DateLineChart, SessionBarChart, SigmaChart

Source spec: `ADDL_PARITY_TESTS.md` (repo root).

Goal: add real core-vs-pipeline diff assertions (not just sanity checks) to
three test files, following the pattern already established in
`totalChartParity.test.ts` / `sigmaTabParity.test.ts`. Test-only work —
components themselves must not be touched.

(Note: previous HANDOFF.md content for the `@dyel/api` sheet-parsing task is
superseded — that work is complete and committed; see git log.)

## Status — ALL COMPLETE

All 7 tasks done; full `packages/app` suite green (26 test files, 282 tests
passed, no regressions). See "Final QA results" below.

## Task Tracking

- [x] Task 1: Port `beforeAll` legacy-computation block (imports:
      `buildSessionStats`, `parseConjugateData` from `@dyel/core`;
      `buildChartData`, `filterByDateRange` from `@dyel/api`; `extractPairs`,
      `buildTabRows`, `computeEffectiveNames` from `../utils/appDataUtils`;
      `computeBaselineTargetExercises` from
      `../hooks/data/useBaselineTargetExercises`; `joinChartPointsByDate` from
      `../testUtils/diffChartSeries`) into `dateLineChartParity.test.ts`, add
      module-level `joined`, rename describe to `'DateLineChart
    core-vs-pipeline parity'`. Keep existing sanity assertions.
      (Target: `packages/app/src/pipeline/dateLineChartParity.test.ts`,
      Test: `npm test -w packages/app -- dateLineChartParity`)

- [x] Task 2: In the same file, add `it.each(TOTAL_CHART_IDS)('soft-warn: %s
    divergence', ...)` using `diffSeries(joined, series)`, asserting
      `comparedCount > 0` and `console.warn`-ing compared/missingInA/
      missingInB/maxAbsDiff/maxRelDiff. No hard value assertion.
      (Target: `packages/app/src/pipeline/dateLineChartParity.test.ts`,
      Test: `npm test -w packages/app -- dateLineChartParity`)

- [x] Task 3: Port same `beforeAll` pattern into
      `sessionBarChartParity.test.ts`, including volume merge via
      `calculateVolumeCorrelation` over squat/bench/deadlift/accessory volume
      rows, merged into pipeline output via existing `mergeVolumeIntoChartPoints`
      import and into legacy `buildChartData(...)` volume arg before joining.
      Rename describe to `'SessionBarChart core-vs-pipeline parity'`.
      (Target: `packages/app/src/pipeline/sessionBarChartParity.test.ts`,
      Test: `npm test -w packages/app -- sessionBarChartParity`)

- [x] Task 4: In the same file, add (a) `it.each(['squat', 'deadlift'])
    ('soft-warn: %s divergence', ...)` (skip bench/pushPull/total), and
      (b) hard `it('volume series matches exactly', ...)` copied verbatim
      from `sigmaTabParity.test.ts` (`maxAbsDiff: 0, missingInA: 0,
    missingInB: 0`).
      (Target: `packages/app/src/pipeline/sessionBarChartParity.test.ts`,
      Test: `npm test -w packages/app -- sessionBarChartParity`)

- [x] Task 5: Port same `beforeAll` pattern (no volume merge) into
      `sigmaChartParity.test.ts`, reusing the existing `lastValuesByLift`
      helper unchanged, called on both legacy `buildChartData(...)` output
      and `pipelineOutput` (raw `ChartPoint[]`, not joined data). Rename
      describe to `'SigmaChart core-vs-pipeline parity'`.
      (Target: `packages/app/src/pipeline/sigmaChartParity.test.ts`,
      Test: `npm test -w packages/app -- sigmaChartParity`)

- [x] Task 6: In the same file, add `it.each(['squat', 'bench', 'deadlift'])
    ('last-value parity: %s agreement', ...)` comparing
      `lastValuesByLift(legacyChartData)[lift]` vs
      `lastValuesByLift(pipelineOutput)[lift]` with inline relative-diff calc
      (`Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b))`), soft-warn if > 0.05, both values `toBeDefined()`. No `diffSeries`/
      `joinChartPointsByDate` import needed for this test.
      (Target: `packages/app/src/pipeline/sigmaChartParity.test.ts`,
      Test: `npm test -w packages/app -- sigmaChartParity`)

- [x] Task 7 (QA): Run all three updated test files together plus the full
      `packages/app` suite; confirm nothing else broke and `console.warn`
      diff output looks sane (no `missingInA`/`missingInB` > 0 outside the
      already-known `pushPull` gap).
      (Target: n/a,
      Test: `npm test -w packages/app -- dateLineChartParity sessionBarChartParity sigmaChartParity && npm test -w packages/app`)

## Non-goals

- Do not modify `DateLineChart.tsx`, `SessionBarChart.tsx`, `SigmaChart.tsx`.
- No hard-fail on already-known divergences (squat/bench/deadlift/pushPull/
  total) — soft-warn only, except volume (hard, exact match).
- No new fixture — reuse `packages/app/test/fixtures/total-chart-sheet.csv`.
- Flag (don't act on) whether `dateLineChartParity.test.ts` duplicates
  `totalChartParity.test.ts` coverage enough to be worth merging/removing —
  this is a question for the user, not something to implement.
  **Resolved:** user confirmed consolidation. `dateLineChartParity.test.ts`
  was deleted (`git rm`) — its coverage was a strict subset of
  `totalChartParity.test.ts` (identical fixture + `beforeAll` legacy/pipeline
  computation + `TOTAL_CHART_IDS` series; `totalChartParity.test.ts`'s
  assertions are strictly stronger: hard `missingInA`/`missingInB === 0` for
  non-pushPull series, plus `range`/`ratio` bounds and baseline-identity
  checks that dateLineChartParity lacked). `DateLineChart.tsx` is also
  rendered by `SessionBarChart`/`ConjugateCharts`, but those already have
  their own dedicated parity files (`sessionBarChartParity.test.ts`,
  `conjugateChartParity.test.ts`), so no coverage gap was introduced.

## Final QA results

`npm test -w packages/app -- dateLineChartParity sessionBarChartParity sigmaChartParity`:

- dateLineChartParity.test.ts: 13 passed
- sessionBarChartParity.test.ts: 10 passed
- sigmaChartParity.test.ts: 7 passed

Soft-warn divergence output (all benign, no unexpected missingInA/missingInB
outside the known pushPull gap, all maxRelDiff well under 5%):

```
# dateLineChartParity
core-vs-pipeline squat: compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline bench: compared=16 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.7%
core-vs-pipeline deadlift: compared=10 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.4%
core-vs-pipeline pushPull: compared=25 missingInA=0 missingInB=2 maxAbsDiff=1 maxRelDiff=0.2%
core-vs-pipeline total: compared=9 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%

# sessionBarChartParity
core-vs-pipeline squat: compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline deadlift: compared=10 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.4%
```

`sigmaChartParity.test.ts`'s new last-value-parity test produced no
console.warn output — all three lifts (squat/bench/deadlift) agreed within
the 5% tolerance.

Full `packages/app` suite (at the time, before consolidation): **26 test
files, 282 tests, all passed.** No regressions.

### Post-consolidation re-verification

After deleting `dateLineChartParity.test.ts` per user confirmation, full
`packages/app` suite: **25 test files, 269 tests, all passed.** (269 = 282
minus the 13 tests that lived only in the deleted file.) No regressions.

## Note on `sessionBarChartParity.test.ts` pre-existing drift

Per prior HANDOFF notes, this file currently imports `TOTAL_CHART_SPECS` from
`@dyel/api` (an uncommitted working-tree change), while the other two files
still import it from `'../../../api/src/totalChartSpecs'`. Preserve
whichever import each file currently has — not part of this task's scope to
reconcile.
