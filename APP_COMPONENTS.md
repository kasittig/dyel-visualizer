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

## Ready to migrate (pipeline-native replacement + parity test exist, component not yet switched over)

These three have a working pipeline-native implementation and a passing
core-vs-pipeline parity test already in place, but the component itself still
calls `@dyel/core` at runtime — swapping it over is intentionally deferred.
Wiring one in should be a small, low-risk change (swap the hook/function call,
update the prop signature if the new hook needs different inputs than the
component currently receives) now that the parity test has already validated
the replacement's behavior against legacy.

- `components/shared/DiagnosticsPanel.tsx` — still calls `generateDiagnostics`
  (`@dyel/core`). Pipeline-native replacement ready: new
  `usePipelineDiagnostics` hook (`packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts`)
  wraps `runPipeline` + `PipelineResult.diagnostics`. Parity test passing at
  `packages/app/src/pipeline/diagnosticsPanelParity.test.ts`. To swap: replace
  the `generateDiagnostics` call with `usePipelineDiagnostics`, and change the
  component's props from `rows`/`targetName`/`variantFactor`/`addlWtOffset` to
  `inputMode`/`url`/`pastedText`/`refreshToken` (update the one caller,
  `pages/LiftTabPanel.tsx`, accordingly).
- `components/shared/RepCalculator.tsx` — still calls `findBestE1RM` +
  `buildSessionStats` (`@dyel/core`). Pipeline-native replacement ready: new
  `usePipelineRepCalculator` hook (`packages/app/src/hooks/pipeline/usePipelineRepCalculator.ts`)
  - `findBestE1RMFromPipeline` (`packages/app/src/pipeline/repCalculatorUtils.ts`,
    mirroring legacy `findBestE1RM`'s logic over pipeline `Point[]`/
    `NormalizationModel` data). Parity test passing at
    `packages/app/src/pipeline/repCalculatorParity.test.ts`. To swap: replace the
    `findBestE1RM`/`buildSessionStats` calls with the new hook + helper, and pass
    `inputMode`/`url`/`pastedText`/`refreshToken` down from `App.tsx`.
- `components/shared/StrengthScoreCalculator.tsx` — still calls
  `calculateMetrics` (`@dyel/core`). Pipeline-native replacement ready: new
  `computeStrengthScores` function added to `@dyel/pipeline`
  (`packages/pipeline/src/derive/athlete.ts`, wrapping `wilks`/`dots` and
  adding Schwartz-Malone + percentile-rank support, matching legacy
  `LiftMetrics`'s output shape). Parity test passing at
  `packages/app/src/pipeline/strengthScoreCalculatorParity.test.ts`. To swap:
  this is a one-line change — replace the `calculateMetrics` import/call with
  `computeStrengthScores` (same signature, no prop changes needed).

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

Phase 1 of `MIGRATION_PLAN.md`'s pipeline-side work is complete: `TotalChart`
and `ConjugateCharts` are fully migrated. `DiagnosticsPanel`, `RepCalculator`,
and `StrengthScoreCalculator` each have a pipeline-native replacement and a
passing parity test (see "Ready to migrate" above), but the actual component
swap-over is intentionally deferred — the components still call `@dyel/core`
at runtime. Swapping any of the three should be a small, well-understood
change now that the parity tests have validated the replacement logic.
