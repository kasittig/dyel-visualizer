# Phase 1 — @dyel/api additions only (packages/app untouched)

Objective: add every function the app will need to `@dyel/api`, with tests. **Do not modify any file under `packages/app`** (validators are COPIED, not moved). `git status packages/app` must stay clean.

Every task below is independent unless noted. For each task the agent needs only: the listed source file(s) to read, the listed destination file(s) to write, and the invariants block from `migration/README.md`. Every new export must be added to `packages/api/src/index.ts` and the export table in `packages/api/CLAUDE.md` (tasks may append; team-lead resolves merge conflicts in those two files).

---

## Task 1.1 — Export weightUnit from the barrel

- Read: `packages/api/src/weightUnit.ts`, `packages/api/src/index.ts`
- Do: add `convertWeight`, `roundWeight`, `formatWeight`, and type `DisplayUnit` to the barrel. Copy `packages/app/src/utils/weightUnit.test.ts` to `packages/api/src/weightUnit.test.ts` (adjust import path; do NOT delete the app copy — Phase 2 does).
- Done when: `npm run test -w packages/api` passes including the new test file.

## Task 1.2 — New module `dateRange/dateRangeUtils.ts`

- Read: `packages/app/src/hooks/pipeline/usePipelineTotalChartData.ts` and `usePipelineConjugateChartData.ts` (the identical dateRange→RenderParams conversion, ~lines 50–56), `packages/app/src/App.tsx` (~lines 222–260 date filtering; ~315–326 default range), `packages/app/src/components/shared/DateRangePicker.tsx` (PRESETS array `getRange` arithmetic + preset-active matching).
- Create: `packages/api/src/dateRange/dateRangeUtils.ts` + `dateRangeUtils.test.ts` with:
  - `dateRangeToRenderParams(from: Date | undefined, to: Date | undefined): RenderParams`
  - `isRecordInDateRange(dateMs: number, from: Date | undefined, to: Date | undefined): boolean` — preserve the end-of-day-inclusive `to` handling from App.tsx
  - `presetDateRange(preset: PresetId, today: Date): { from: Date; to: Date }` and `activePreset(from: Date | undefined, to: Date | undefined, today: Date): PresetId | null` — `PresetId = '2w' | '1m' | '3m' | 'all'` (match the presets found in DateRangePicker; labels do NOT move)
  - `defaultDateRangeFromLastSession(lastSessionDate: Date): { from: Date; to: Date }` — 3 months back
- Constraint: plain `Date | undefined` params only — no react-day-picker types, no React.
- Tests: it.each matrix covering preset math, end-of-day inclusivity edge (record at 23:59 on `to` date included), undefined from/to.
- Done when: api tests pass; behavior byte-matches the copied logic (same rounding/boundary semantics).

## Task 1.3 — New module `model/modelSelectors.ts` (App.tsx derivations)

- Read: `packages/app/src/App.tsx` (~lines 193–313), existing type `SplitRows` in `packages/api/src/sheet/parseSheetData.ts`.
- Create: `packages/api/src/model/modelSelectors.ts` + test with (all take `tabRows: Record<LiftType, SplitRows>`):
  - `detectDataUnit(tabRows): 'lbs' | 'kg'` — first `meta.rawUnit` found (App.tsx ~273–282)
  - `collectSessionDates(tabRows): { allSessionDates: Date[]; lastSessionDate: Date | null }` — dedupe by day (App.tsx ~289–313)
  - `collectVolumeRecords(tabRows): TaggedSetRecord[]` — spread of per-lift volume arrays (App.tsx ~263–270)
  - `defaultCanonicalsByLift(tabRows, deadliftStance): Partial<Record<LiftType, string>>` — App.tsx ~199–219 contains TWO IDENTICAL loops (baseline + target) calling `defaultCompExerciseCanonical` per lift; implement ONCE (callers use the single result twice)
  - `visibleLiftTypes(tabRows, from: Date | undefined, to: Date | undefined): LiftType[]` — the tab date filter (App.tsx ~222–247), reusing `isRecordInDateRange` from Task 1.2 (depends on 1.2)
- Tests: unit detection incl. no-rawUnit fallback, session-date dedup/ordering, canonicals per deadlift stance, tab visibility at range edges.

## Task 1.4 — New module `diagnostics/`

- Read: `packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts` (pure map/filter of `model.diagnostics.variants` by `lift:${liftType}`), `packages/app/src/components/shared/DiagnosticsPanel.tsx` (~lines 46–67 weak/overtrained tally; `formatEffect`/`formatAddlWtOffset` helpers).
- Create:
  - `packages/api/src/diagnostics/diagnosticsSelectors.ts`: `selectDiagnosticVariants(model: PipelineModel, liftType?: LiftType)` (same output shape the hook returns today) and `summarizeEffects(variants)` (the tally — keep the exact counting semantics).
  - `packages/api/src/diagnostics/diagnosticsUtils.ts`: `formatEffect`, `formatAddlWtOffset` (they use `convertWeight` from `../weightUnit`).
  - Colocated tests; port the logic assertions from `packages/app/src/hooks/pipeline/usePipelineDiagnostics.test.ts` (do not delete the app test — Phase 2 does).
- Note: the status→color/label mapping in DiagnosticsPanel (~lines 144–159) is UI — do NOT move it.

## Task 1.5 — Chart/variation/conjugate additions to existing modules

Three sub-extractions; can be one agent or three:

- **a.** Read `packages/app/src/components/charts/SigmaChart.tsx` (~lines 17–44). Add `latestLiftE1RMs(data: ChartPoint[]): { squat?: number; bench?: number; deadlift?: number }` (forward-fill last value per lift) to `packages/api/src/chart/pipelineChartUtils.ts` + test cases in `pipelineChartUtils.test.ts`.
- **b.** Read `packages/app/src/components/charts/VariationRadarChart.tsx` (~lines 33–47). Add `buildRadarRows(normalizedSnapshot)` (reshape into sorted `{variation, e1rm, targetE1rm}[]`, filter undefined) to `packages/api/src/variation/variationRadarSelectors.ts` + tests.
- **c.** Read `packages/app/src/hooks/pipeline/usePipelineConjugateChartData.ts` (~lines 59–99). Create `packages/api/src/conjugate/conjugateChartData.ts` + test with `buildConjugateChartData(rawVariations: RechartsRow[], rawNormalized: RechartsRow[], unit)` (dedupe/sort variation keys, merge rows by `t`, uses existing `mergeWideRechartsRows`) and `roundBestSetsForDisplay(bestSetByLabelAndDate, unit)` (the `roundWeight` remap). Reuse the fixture pattern from `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.test.ts`.

## Task 1.6 — Small classifiers

- **a.** Read `packages/app/src/components/shared/StrengthScoreCalculator.tsx` (`tierInfo(percentile)`). Add `strengthTierForPercentile(percentile: number)` to `packages/api/src/strengthScores.ts` — thresholds + tier label ONLY; the tier→color mapping and `ordinal()` stay in the component. Add boundary-matrix test (create `strengthScores.test.ts`).
- **b.** Read `packages/app/src/components/pages/PipelineValidationPage.tsx` (~lines 114–120). Create `packages/api/src/validation/validationVerdict.ts`: `classifyPipelineVerdict(result: PipelineResult): 'error' | 'warning' | 'ok'` (parseErrors→error, unknown/unnormalized→warning) + matrix test.
- **c.** Read `packages/app/src/hooks/pipeline/usePipelineRepCalculator.ts` (local `roundTo5`). If semantics match `roundWeight` in `packages/api/src/weightUnit.ts`, no new code needed (note it for Phase 2); otherwise add `roundTo5` to `packages/api/src/repCalculator/repCalculatorUtils.ts` + test.

## Task 1.7 — Pipeline entry-point wrappers

- Read: `packages/app/src/App.tsx` (the `runPipelineModel(raw, athlete)` call), `packages/app/src/hooks/infra/usePipelineValidation.ts` (the `runPipeline` call and its exact arguments), `packages/api/src/sheet/parseSheetData.ts` (precedent for calling pipeline internals).
- Create:
  - `packages/api/src/pipeline/buildPipelineModel.ts`: `buildPipelineModel(raw: RawInput[], athlete: AthleteContext): PipelineModel` — thin wrapper over `runPipelineModel` from `@dyel/pipeline`.
  - `packages/api/src/pipeline/validatePipelineRun.ts`: `validatePipelineRun(...)` wrapping `runPipeline` with EXACTLY the argument shape usePipelineValidation.ts uses today.
  - Smoke tests against an existing fixture CSV (see `packages/api/src/sheet/parseSheetData.test.ts` for fixture usage).
- Document both in `packages/api/CLAUDE.md` under the existing "raw-input entry point" exception (same category as `parseSheetData`/`parseTextData`).

## Task 1.8 — Copy validators into api

- Read: `packages/app/src/utils/validators/pipelineSheetValidator.ts`, `pipelineFreeformValidator.ts`, and their tests.
- Do: COPY (not move) both to `packages/api/src/validation/` with tests; imports of `classifyExerciseName` become local (`./classifyExerciseName`); add `papaparse` (+ `@types/papaparse` if pipeline has it) to `packages/api/package.json` dependencies, versions matching `packages/pipeline/package.json`. Export `validateSheetCsv`, `validateTextData` from the barrel.
- Do NOT touch the app copies.

---

## Phase verification (team-lead)

1. `npm run build -w packages/api && npm run test -w packages/api` — green.
2. `git status --short packages/app` — empty.
3. `npm run build -w packages/app` — still green (app untouched but barrel changed).
4. Every new export appears in both `packages/api/src/index.ts` and the `packages/api/CLAUDE.md` table.
