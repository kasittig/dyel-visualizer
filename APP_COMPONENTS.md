# App components still on `@dyel/core` (migration candidates to `@dyel/pipeline`)

Inventory of `packages/app/src` components/hooks that depend on `@dyel/core`,
per the pipeline migration boundary rule (migrated components must call only
`runPipeline`, never `@dyel/core`).

## Already migrated

- `components/charts/TotalChart.tsx` — via `usePipelineTotalChartData` +
  `pipeline/totalChartSpecs.ts`. `ChartPoint` is now declared pipeline-natively
  in `packages/pipeline/src/dataset/build.ts` and imported from `@dyel/pipeline`
  — zero remaining `@dyel/core` references (closed out in Phase 1, Track 1).
- `components/pages/SigmaTab.tsx` — via the same `usePipelineTotalChartData` +
  `pipeline/totalChartSpecs.ts` (previously dead code — nothing called the hook
  until this migration). The `volume`/accessory-volume series `SessionBarChart`
  needs is merged in via a new `mergeVolumeIntoChartPoints` helper
  (`utils/pipelineChartUtils.ts`) against the `volumeByDate` prop, which was
  already computed independently in `App.tsx` (`calculateVolumeCorrelation`)
  and required no pipeline-side change. Zero remaining `@dyel/core` references
  in `SigmaTab.tsx` itself. Parity test: `pipeline/sigmaTabParity.test.ts`
  (closed out in Phase 2; see `MIGRATION_PLAN.md`).
- `components/charts/SessionBarChart.tsx` — `ChartPoint` now imported from
  `@dyel/pipeline`; `formatDate` relocated to a new `formatChartDate` helper in
  `utils/pipelineChartUtils.ts` (identical tick-formatting behavior). Zero
  remaining `@dyel/core` references. Parity test:
  `pipeline/sessionBarChartParity.test.ts` — lightweight sanity/regression
  check (no legacy diff needed; this component has no aggregation logic of
  its own) (closed out in Phase 3; see `MIGRATION_PLAN.md`).
- `components/charts/SigmaChart.tsx` — its only `@dyel/core` dependency (the
  `ChartPoint` type) now imports from `@dyel/pipeline`. Parity test:
  `pipeline/sigmaChartParity.test.ts` — thin consumer check replicating the
  component's own last-value squat/bench/deadlift extraction logic (closed
  out in Phase 3).
- `components/charts/DateLineChart.tsx` — same `formatChartDate`/`ChartPoint`
  treatment as `SessionBarChart`. Parity test:
  `pipeline/dateLineChartParity.test.ts` — smoke/regression check across its
  real consumers (`TotalChart`, `SigmaTab`'s Σ line) (closed out in Phase 3).

## Ready to migrate (pipeline-native replacement + parity test exist, component not yet switched over)

These five have a working pipeline-native implementation and a passing
core-vs-pipeline parity test already in place, but the component itself still
calls `@dyel/core` at runtime — swapping it over is intentionally deferred.
Two of them (`RepCalculator`, `StrengthScoreCalculator`) are genuinely small,
low-risk swaps (swap the hook/function call, update the prop signature) now
that their parity tests have validated the replacement's behavior against
legacy. The other three (`ConjugateCharts`, `DiagnosticsPanel`,
`VariationRadarChart`) each carry a real, documented blocker beyond "wire up
the hook" — see each entry below before attempting those.

- `components/conjugate/ConjugateCharts.tsx` — still calls
  `useConjugateChartData` (`@dyel/core`'s `buildVariationChartData`
  internally) and imports `LINE_COLORS`/`RepCalcStats` directly from
  `@dyel/core`. This was previously migrated to `@dyel/pipeline` but was
  **deliberately reverted** back to `@dyel/core` (see `46f267f` "Revert
  ConjugateCharts from @dyel/pipeline back to @dyel/core" and
  `HANDOFF.md`) after divergence was found between the two
  implementations. Pipeline-native replacement still exists at
  `packages/app/src/pipeline/conjugateChartSpecs.ts` (a `DatasetSpec[]`
  builder with no other importer) and is exercised by the core-vs-pipeline
  regression harness at `packages/app/src/pipeline/conjugateChartParity.test.ts`
  — this parity test is what surfaced the divergence and is what any future
  re-migration attempt needs to satisfy before the component is swapped
  back over. Do not re-attempt the swap without resolving the documented
  divergence first.
- `components/shared/DiagnosticsPanel.tsx` — still calls `generateDiagnostics`
  (`@dyel/core`). Pipeline-native replacement exists: `usePipelineDiagnostics` hook
  (`packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts`) wraps `runPipeline` +
  `PipelineResult.diagnostics`, with a soft-warn parity test at
  `packages/app/src/pipeline/diagnosticsPanelParity.test.ts`. **Swap is intentionally
  deferred** — closer scoping against the component's actual render logic (not just the
  parity test's structural checks) found this is not a small wiring change: pipeline's
  `diagnose()` has no canonical→display-name resolution (the table needs `displayName`,
  pipeline only has a bare `canonical` slug), no modifier-percentage-baseline-range model
  (the table needs `averageIndex`/`expectedBaseline` as a % range; pipeline only produces a
  flat `expectedE1rmKg`/`ratio`), a different status-classification model (not just a
  renamed enum — legacy uses a baseline min/max range, pipeline a flat tolerance band), and
  no additional-weight offset data. `usePipelineDiagnostics`'s props
  (`inputMode`/`url`/`pastedText`/`refreshToken`, self-fetching) also don't match the
  component's current pre-computed `rows`/`targetName`/`variantFactor`/`addlWtOffset` props,
  meaning a swap would also touch `pages/LiftTabPanel.tsx`'s prop-drilling. See
  `migration/DiagnosticsPanel.md`'s Status section for full detail. Held to the same bar as
  `VariationRadarChart` below — missing pipeline functionality is a proposed pipeline
  change, not a client-side workaround.
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
- `components/charts/VariationRadarChart.tsx` — still calls
  `normalizeToBaseE1RM` and imports `ConjugateExercise` directly from
  `@dyel/core`. Pipeline-native replacement exists and is validated on the
  current fixture (no divergence observed) via `conjugateChartSpecs()` +
  `testUtils/diffVariationSnapshot.ts`'s `snapshotVariationsFromPipeline`/
  `snapshotVariationsFromLegacy`/`diffVariationSnapshots`, exercised by
  `packages/app/src/pipeline/variationRadarChartParity.test.ts`. **Swap is
  intentionally deferred**, for two reasons, not just one: (1) the underlying
  per-variation normalization is the same logic `ConjugateCharts` was
  **reverted away from** after its own parity test surfaced real divergence
  (`46f267f`; see `HANDOFF.md`) — swapping this component now, before that
  divergence is root-caused, risks silently reintroducing the same bug into a
  second user-facing chart, even though this test file's soft-warn logging
  hasn't (yet) surfaced divergence on the current fixture; (2) the pipeline
  snapshot only carries last-value e1RM numbers, not the last-session detail
  (date, sets, reps, weight, RPE) the component's tooltip currently renders —
  a swap would need that data sourced separately to stay feature-complete, not
  just a hook swap like the other four. Do not attempt this swap without first
  resolving (1), and solving (2).

## Not yet migrated

Components that still call `@dyel/core` for real business logic:

| Component                 | `@dyel/core` usage                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `pages/LiftTabPanel.tsx`  | `filterByDateRange`, `DeadliftStancePreference`, `LiftType`                                     |
| `pages/ValidatorPage.tsx` | `SheetValidationResult`, `ColumnInfo` (likely intentionally core-only — legacy sheet validator) |

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

Phase 1, Phase 2, and Phase 3 of `MIGRATION_PLAN.md` are complete. `TotalChart`,
`SigmaTab`, `SessionBarChart`, `SigmaChart`, and `DateLineChart` are fully
migrated (zero `@dyel/core` references, each with a passing parity test).
`ConjugateCharts`, `DiagnosticsPanel`, `RepCalculator`, `StrengthScoreCalculator`,
and `VariationRadarChart` each have a pipeline-native replacement and a passing
parity test (see "Ready to migrate" above), but the actual component swap-over
is intentionally deferred for all five — the components still call `@dyel/core`
at runtime. `ConjugateCharts` specifically was migrated once already and
**reverted** after the parity test surfaced real divergence from legacy (see
`HANDOFF.md`, Session 6); any future attempt to swap it back over must
resolve that divergence first. `VariationRadarChart` shares the same
underlying divergence risk (see its entry above) plus a tooltip-data gap, so
it's held to the same bar. `DiagnosticsPanel` was initially assessed as a
small swap too, but scoping it directly against the component's render logic
found a real gap instead (no canonical→display-name resolution, no
percentage-baseline-range model, a differently-classified status enum, no
add'l-weight offset data — see `migration/DiagnosticsPanel.md`'s Status
section), so it's now held to the same "real blocker, not a wiring task" bar
as `ConjugateCharts`/`VariationRadarChart`. Swapping `RepCalculator` or
`StrengthScoreCalculator` should still be a small, well-understood change now
that their parity tests have validated the replacement logic.

See `MIGRATION_PLAN.md` for the next candidates (Phase 4: `LiftTabPanel.md`,
blocked on `ConjugateCharts`/`VariationRadarChart`/`DiagnosticsPanel` swap-overs).
