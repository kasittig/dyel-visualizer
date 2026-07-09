# Real parity tests for DateLineChart, SessionBarChart, SigmaChart

## Context

`packages/app/src/pipeline/dateLineChartParity.test.ts`,
`sessionBarChartParity.test.ts`, and `sigmaChartParity.test.ts` are
currently **sanity-only** — they compute pipeline output and assert it's
non-empty/well-formed, but never compute the legacy `@dyel/core` output or
diff against it (unlike `totalChartParity.test.ts` and
`sigmaTabParity.test.ts`, which do real core-vs-pipeline diffs).

This is fixable with almost no new logic: all three components consume the
**same underlying data** that `totalChartParity.test.ts`/
`sigmaTabParity.test.ts` already diff:

- `DateLineChart` is the literal shared shell `TotalChart` renders into
  (`TotalChart.tsx` imports `DateLineChart` directly and passes it the same
  `chartData`/`TOTAL_CHART_SPECS` output). Its "parity" is really
  `TotalChart`'s parity.
- `SessionBarChart` and `SigmaChart` are both rendered by
  `SigmaTab.tsx` from the exact same `usePipelineTotalChartData(dateRange,
unit)` result — same `TOTAL_CHART_SPECS`, same
  `calculateVolumeCorrelation` volume merge already diffed in
  `sigmaTabParity.test.ts`.

So this task is: **copy the existing legacy-computation + diff harness**
from `totalChartParity.test.ts`/`sigmaTabParity.test.ts` into the three
existing sanity test files, reusing `src/testUtils/diffChartSeries.ts`
(`joinChartPointsByDate`, `diffSeries`) and `src/testUtils/
compareChartSeries.ts` exactly as documented in
`src/testUtils/CLAUDE.md`. No new legacy code, no new fixture — everything
needed already exists.

**Scope:** add real core-vs-pipeline diff assertions to the three named
test files. Do not touch the components themselves (`DateLineChart.tsx`,
`SessionBarChart.tsx`, `SigmaChart.tsx`) — this is test-only work per the
documented parity-test-harness exception in `packages/app/CLAUDE.md`.

## Reference implementation to copy from

`packages/app/src/pipeline/sigmaTabParity.test.ts` is the best template —
it already computes both sides (legacy `buildChartData`/`buildSessionStats`

- pipeline `runPipeline`) over `total-chart-sheet.csv`, merges in volume,
  and has both a soft-warn diff block (`it.each(['squat', 'deadlift',
'pushPull', 'total'])('soft-warn: %s divergence', ...)`) and a hard exact
  match (`'volume series matches exactly'` — `maxAbsDiff: 0, missingInA: 0,
missingInB: 0`). Reuse its `beforeAll` block verbatim as the base for
  Tasks 1 and 2 below.

## Tasks

- [ ] Task 1: In `packages/app/src/pipeline/dateLineChartParity.test.ts`,
      port the `beforeAll` legacy-computation block from
      `sigmaTabParity.test.ts` (imports: `buildSessionStats`,
      `parseConjugateData` from `@dyel/core`; `buildChartData`,
      `filterByDateRange` from `@dyel/api`; `extractPairs`, `buildTabRows`,
      `computeEffectiveNames` from `../utils/appDataUtils`;
      `computeBaselineTargetExercises` from
      `../hooks/data/useBaselineTargetExercises`; `joinChartPointsByDate`
      from `../testUtils/diffChartSeries`). Add a module-level `joined:
    ReturnType<typeof joinChartPointsByDate>` alongside the existing
      `pipelineOutput`, computed the same way `sigmaTabParity.test.ts` does
      (`buildChartData(filteredSigma, baselineExByType, targetExByType,
    buildSessionStats(...), volume)` joined against `pipelineOutput` via
      `joinChartPointsByDate`). Rename the outer `describe` from
      `'DateLineChart pipeline data sanity'` to `'DateLineChart
    core-vs-pipeline parity'`. Do not remove any existing sanity
      assertions — only add to `beforeAll` and imports.
      (Target: `packages/app/src/pipeline/dateLineChartParity.test.ts`, Test: `npm test -w packages/app -- dateLineChartParity`)

- [ ] Task 2: In the same file, add an `it.each(TOTAL_CHART_IDS)('soft-warn:
    %s divergence', ...)` block identical in shape to the one in
      `totalChartParity.test.ts` (asserts `diff.comparedCount >
    0`, logs `console.warn` with `compared`/`missingInA`/`missingInB`/
      `maxAbsDiff`/`maxRelDiff`, no hard value assertion). Use
      `diffSeries(joined, series)` from `../testUtils/diffChartSeries`.
      (Target: `packages/app/src/pipeline/dateLineChartParity.test.ts`, Test: `npm test -w packages/app -- dateLineChartParity`)

- [ ] Task 3: In `packages/app/src/pipeline/sessionBarChartParity.test.ts`,
      port the same `beforeAll` legacy-computation pattern as Task 1, but
      include the volume merge exactly as `sigmaTabParity.test.ts` does
      (`calculateVolumeCorrelation` over `tabRows.*.volume` for
      squat/bench/deadlift/accessory, merged into both `pipelineOutput` via
      `mergeVolumeIntoChartPoints` — already imported in this file — and
      into the legacy `buildChartData(...)` call's `volume` argument
      before joining). Rename the outer `describe` to `'SessionBarChart
    core-vs-pipeline parity'`.
      (Target: `packages/app/src/pipeline/sessionBarChartParity.test.ts`, Test: `npm test -w packages/app -- sessionBarChartParity`)

- [ ] Task 4: In the same file, add two assertions using the joined data
      from Task 3: (a) an `it.each(['squat', 'deadlift'])('soft-warn: %s
    divergence', ...)` block matching the `totalChartParity.test.ts`
      pattern (skip `bench`/`pushPull`/`total` — SessionBarChart only
      renders squat/bench/deadlift/volume bars, and `bench` already has
      its own dedicated soft-warn test per Task pattern below), and (b) a
      hard `it('volume series matches exactly', ...)` test copied verbatim
      from `sigmaTabParity.test.ts` (`expect(diffSeries(joined,
    'volume')).toMatchObject({ maxAbsDiff: 0, missingInA: 0, missingInB:
    0 })`).
      (Target: `packages/app/src/pipeline/sessionBarChartParity.test.ts`, Test: `npm test -w packages/app -- sessionBarChartParity`)

- [ ] Task 5: In `packages/app/src/pipeline/sigmaChartParity.test.ts`, port
      the same `beforeAll` legacy-computation pattern as Task 1 (no volume
      merge needed — `SigmaChart` only renders squat/bench/deadlift, not
      volume). This file already has a `lastValuesByLift(chartData:
    ChartPoint[])` helper that reduces a `ChartPoint[]` series to
      `{ squat, bench, deadlift }` last-known-values — reuse it unchanged,
      calling it on BOTH the legacy `buildChartData(...)` output and the
      existing `pipelineOutput` (not on the joined/diffed data — this
      helper operates on a raw `ChartPoint[]`, not a `JoinedChartPoint[]`).
      Rename the outer `describe` to `'SigmaChart core-vs-pipeline
    parity'`.
      (Target: `packages/app/src/pipeline/sigmaChartParity.test.ts`, Test: `npm test -w packages/app -- sigmaChartParity`)

- [ ] Task 6: In the same file, add
      `it.each(['squat', 'bench', 'deadlift'])('last-value parity: %s
    agreement', (lift) => {...})` that computes
      `lastValuesByLift(legacyChartData)[lift]` and
      `lastValuesByLift(pipelineOutput)[lift]`, and soft-warns (does not
      hard-fail) if they differ by more than a small relative tolerance —
      follow the tolerance-with-warn pattern documented in
      `src/testUtils/CLAUDE.md`'s "Core-vs-pipeline live diff harness"
      section (`if relDiff > 0.05, console.warn(...)`; still assert both
      values are `toBeDefined()`). Do not import `diffSeries`/
      `joinChartPointsByDate` for this test — the last-value comparison is
      a plain scalar diff, not a date-joined series diff; compute
      `Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b))` inline.
      (Target: `packages/app/src/pipeline/sigmaChartParity.test.ts`, Test: `npm test -w packages/app -- sigmaChartParity`)

- [ ] Task 7 (QA): Run all three updated test files together plus the full
      `packages/app` suite, to confirm nothing else broke and the new
      `console.warn` diff output looks sane (no `missingInA`/`missingInB` >
      0 outside the already-known `pushPull` gap documented in
      `totalChartParity.test.ts`).
      (Target: n/a, Test: `npm test -w packages/app -- dateLineChartParity sessionBarChartParity sigmaChartParity && npm test -w packages/app`)

## Explicit non-goals

- Do not modify `DateLineChart.tsx`, `SessionBarChart.tsx`, or
  `SigmaChart.tsx` — this is test-only, per the documented parity-test
  exception in `packages/app/CLAUDE.md`.
- Do not hard-fail on divergences already known and tracked for
  `TotalChart`/`SigmaTab` (squat/bench/deadlift/pushPull/total residuals)
  — soft-warn only, matching the existing precedent, unless a task above
  explicitly calls for a hard assertion (volume only).
- Do not invent a new fixture — reuse
  `packages/app/test/fixtures/total-chart-sheet.csv`, already used by all
  the other `*ChartParity.test.ts` files.
- Consider (but do not implement without asking first) whether
  `dateLineChartParity.test.ts` is worth keeping as a separate file at all
  once it duplicates `totalChartParity.test.ts`'s coverage — flag this as
  a question for review rather than deleting the file.
