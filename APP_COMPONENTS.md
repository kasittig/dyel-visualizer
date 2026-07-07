# App components still on `@dyel/core` (migration candidates to `@dyel/pipeline`)

Inventory of `packages/app/src` components/hooks that depend on `@dyel/core`,
per the pipeline migration boundary rule (migrated components must call only
`runPipeline`, never `@dyel/core`).

## Already migrated

- `components/charts/TotalChart.tsx` — via `usePipelineTotalChartData` +
  `pipeline/totalChartSpecs.ts`. `ChartPoint` is now declared pipeline-natively
  in `packages/pipeline/src/dataset/build.ts` and imported from `@dyel/pipeline`
  — zero remaining `@dyel/core` references (closed out in Phase 1, Track 1).
- `components/conjugate/ConjugateCharts.tsx` — via `useConjugateChartData` +
  `pipeline/conjugateChartSpecs.ts`. `LINE_COLORS` is now declared in
  `packages/pipeline/src/utils/colors.ts` and imported from `@dyel/pipeline` —
  zero remaining `@dyel/core` references. Parity test added at
  `packages/app/src/pipeline/conjugateChartParity.test.ts` (closed out in
  Phase 1, Track 2).
- `components/shared/DiagnosticsPanel.tsx` — via new `usePipelineDiagnostics`
  hook (`packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts`) +
  `PipelineResult.diagnostics`. Zero remaining `@dyel/core` references. Parity
  test added at `packages/app/src/pipeline/diagnosticsPanelParity.test.ts`
  (closed out in Phase 1, Track 3). Note: `pages/LiftTabPanel.tsx` was updated
  to pass the new prop shape through to `DiagnosticsPanel`, but `LiftTabPanel`
  itself remains on the "not yet migrated" list below (still blocked on
  Phase 4 dependencies).
- `components/shared/StrengthScoreCalculator.tsx` — via new
  `computeStrengthScores` function added to `@dyel/pipeline`
  (`packages/pipeline/src/derive/athlete.ts`, wrapping `wilks`/`dots` and
  adding Schwartz-Malone + percentile-rank support). Zero remaining
  `@dyel/core` references. Parity test added at
  `packages/app/src/pipeline/strengthScoreCalculatorParity.test.ts` (closed
  out in Phase 1, Track 5).
- `components/shared/RepCalculator.tsx` — via new `usePipelineRepCalculator`
  hook (`packages/app/src/hooks/pipeline/usePipelineRepCalculator.ts`) +
  `findBestE1RMFromPipeline` (`packages/app/src/pipeline/repCalculatorUtils.ts`,
  mirroring legacy `findBestE1RM`'s logic over pipeline `Point[]`/
  `NormalizationModel` data). Zero remaining `@dyel/core` references (the old
  `utils/repCalculatorStats.ts` core-backed wrapper was deleted). Parity test
  at `packages/app/src/pipeline/repCalculatorParity.test.ts` (closed out in
  Phase 1, Track 4, after two incomplete follow-up passes).

## Not yet migrated

Components that still call `@dyel/core` for real business logic:

| Component                        | `@dyel/core` usage                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `charts/VariationRadarChart.tsx` | `normalizeToBaseE1RM`, `ConjugateExercise`                                                      |
| `charts/SessionBarChart.tsx`     | `formatDate`, `ChartPoint`                                                                      |
| `charts/DateLineChart.tsx`       | `formatDate`, `ChartPoint`                                                                      |
| `charts/SigmaChart.tsx`          | `ChartPoint` type                                                                               |
| `pages/LiftTabPanel.tsx`         | `filterByDateRange`, `DeadliftStancePreference`, `LiftType`                                     |
| `pages/SigmaTab.tsx`             | `buildChartData`, `LiftType`, `SessionStats`                                                    |
| `pages/ValidatorPage.tsx`        | `SheetValidationResult`, `ColumnInfo` (likely intentionally core-only — legacy sheet validator) |

## Supporting hooks (not components, but feed the above)

- `hooks/data/useIndexData.ts`
- `hooks/data/useLastSessionStats.ts`
- `hooks/data/useBaselineTargetExercises.ts`
- `hooks/conjugate/useConjugateData.ts`
- `hooks/infra/useSheetValidation.ts`
- `hooks/infra/useTextValidation.ts`

## Other `@dyel/core` consumers in `packages/app/src` (non-component)

- `utils/appUtils.ts`
- `utils/appDataUtils.ts`
- `utils/sheetCacheUtils.ts`

## Status

Phase 1 of `MIGRATION_PLAN.md` is complete: `TotalChart`, `ConjugateCharts`,
`DiagnosticsPanel`, `StrengthScoreCalculator`, and `RepCalculator` are all
migrated off `@dyel/core` with parity tests in place (see "Already migrated"
above). Remaining "not yet migrated" components are Phase 2+ work.
