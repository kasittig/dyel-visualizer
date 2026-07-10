# API Phase 2: Repoint `packages/app` consumers to `@dyel/api`

## Status: DONE — all 19 tasks (13-31) landed and verified. See `HANDOFF.md` for the

final regression numbers and delegation notes.

## Background

Second of four phased docs implementing the `@dyel/api`-as-sole-boundary decision (see
`API_PHASE_1.md` for full context and the underlying rationale). This phase requires
Phase 1's `packages/api` additions to already exist — every task here repoints an
existing `packages/app` import from `@dyel/pipeline` to the equivalent `@dyel/api`
export.

**Target end state:** the only direct `@dyel/pipeline` imports remaining anywhere in
`packages/app/src` after this phase are:

- `App.tsx`: `runPipelineModel` (function), `AthleteContext` (type) — the legitimate
  model-construction entry point, analogous to how `@dyel/api`'s own
  `parseSheetData`/`parseTextData` call `runPipelineModel` internally as a documented
  exception.
- `hooks/infra/usePipelineValidation.ts`: `runPipeline` (function) — the legitimate
  ad-hoc validation entry point for URL/text input.

Everything else moves to `@dyel/api`.

## Design decision: `RepCalculator.tsx` becomes render-only

`RepCalculator.tsx` currently holds real business logic inline (facet/candidate-key
matching to resolve `effectiveCanonical`, `availableMagnitudes` derivation,
`syncFacetsAndInputs`). This phase extends the already-present-but-currently-unused
`hooks/pipeline/usePipelineRepCalculator.ts` (today it only returns a bare
`NormalizationModel` and isn't even called by `RepCalculator.tsx` — dead code) into the
component's full controller:

```ts
usePipelineRepCalculator(
  tabRows: Record<LiftType, SplitRows>,
  baselineNames: Partial<Record<LiftType, string>>
): {
  liftType, setLiftType, exercisesForType, activeCanonical, selectedRecord,
  selectedBar, setSelectedBar, selectedStance, setSelectedStance,
  selectedEquipment, setSelectedEquipment, selectedAddlWt, setSelectedAddlWt,
  selectedEquipmentMagnitude, setSelectedEquipmentMagnitude, availableMagnitudes,
  reps, weight, handleRepsChange, handleWeightChange, handleSelectedCanonicalChange,
  unit, estimate,
}
```

The hook keeps all `useState`/`useMemo`/`useEffect` (state ownership is legitimate
Controller-layer work per `packages/app/CLAUDE.md`'s MVC mapping), but every
matching/derivation call goes through `@dyel/api`'s `repCalculator/repCalculatorSelectors.ts`
and `repCalculator/repCalculatorUtils.ts` instead of touching `facetsFromTags`/
`facetFamilyKey`/`invertE1RM`/etc. directly. `RepCalculator.tsx` is left with only
`roundTo5`, `sourceNote` (kept local — pure UI-string formatting on an already-resolved
plain object, no pipeline-type awareness, not worth over-factoring per root
`CLAUDE.md`'s micro-expression rule), `LIFT_LABELS`, and JSX wired to the hook's return
values.

**Task 28 (hook) and Task 29 (component) are tightly coupled** — same PR/session
recommended, sequenced strictly (28 before 29), not run in parallel. Splitting them
across independent agents risks a broken intermediate state where the component
references hook fields that don't exist yet.

## Note: `App.tsx`'s date-range filtering stays untouched

`App.tsx`'s tab-visibility date filter and `allSessionDates`/`lastSessionDate`
aggregation (both already operating on plain `TaggedSetRecord[]` via `groupByLiftType`,
using native `Date`/`react-day-picker` types) never import `@dyel/pipeline` today and
don't need to. This is app-level view-state derivation, not Controller-layer pipeline
logic — no task below touches it.

## Task list

### Group A — pure import-path swaps, no logic changes, fully parallelizable

- [x] Task 13: `context/PipelineContext.tsx` (+ `.test.tsx`) — swap `PipelineModel`/
      `AthleteContext` type imports to `@dyel/api` (Target:
      `packages/app/src/context/PipelineContext.tsx`, Test:
      `npm test -w packages/app -- PipelineContext`)
- [x] Task 14: `utils/rawInputUtils.ts` (+ `.test.ts`) — swap `AthleteContext`/
      `RawInput` type imports to `@dyel/api` (Target:
      `packages/app/src/utils/rawInputUtils.ts`, Test:
      `npm test -w packages/app -- rawInputUtils`)
- [x] Task 15: `utils/appUtils.ts` (+ `.test.ts`) — swap `LiftType` import to
      `@dyel/api`'s existing `LiftType` export (note: `@dyel/api` independently
      defines this type rather than re-exporting pipeline's identical one; do not
      reconcile that duplication in this task — see `API_PHASE_4.md`'s "Next up" note)
      (Target: `packages/app/src/utils/appUtils.ts`, Test:
      `npm test -w packages/app -- appUtils`)
- [x] Task 16: `utils/sheetCacheUtils.ts` (+ `.test.ts`) — swap `RawInput` type import
      to `@dyel/api` (Target: `packages/app/src/utils/sheetCacheUtils.ts`, Test:
      `npm test -w packages/app -- sheetCacheUtils`)
- [x] Task 17: `utils/validators/pipelineFreeformValidator.ts` +
      `pipelineSheetValidator.ts` (+ `.test.ts`s) — swap `classifyExerciseName`
      import to `@dyel/api` (Target: `packages/app/src/utils/validators/`, Test:
      `npm test -w packages/app -- validators`)
- [x] Task 18: `components/charts/SessionBarChart.tsx`, `DateLineChart.tsx`,
      `SigmaChart.tsx`, `TotalChart.tsx` — swap `ChartPoint` type import to
      `@dyel/api` (Target: `packages/app/src/components/charts/`, Test:
      `npm test -w packages/app -- charts`)
- [x] Task 19: `components/shared/StrengthScoreCalculator.tsx` — swap
      `computeStrengthScores` import to `@dyel/api` (Target:
      `packages/app/src/components/shared/StrengthScoreCalculator.tsx`, Test:
      `npm test -w packages/app -- StrengthScoreCalculator`)
- [x] Task 20: `components/conjugate/ConjugateCharts.tsx` — swap `LINE_COLORS`
      import to `@dyel/api` (Target:
      `packages/app/src/components/conjugate/ConjugateCharts.tsx`, Test:
      `npm test -w packages/app -- ConjugateCharts`)
- [x] Task 21: `hooks/infra/usePipelineValidation.ts` — keep `runPipeline` from
      `@dyel/pipeline` (legitimate exception), swap `PipelineResult` type import to
      `@dyel/api` (Target: `packages/app/src/hooks/infra/usePipelineValidation.ts`,
      Test: `npm test -w packages/app -- usePipelineValidation`)
- [x] Task 22: `hooks/pipeline/usePipelineDatasets.ts` (+ `.test.ts`) — **correction
      (found during a post-Phase-1 doc review): `buildDatasetsFromModel` is NOT
      exported from `@dyel/api`** — per `API_PHASE_1.md`'s Design decisions, it's
      deliberately engine-internal, never exposed on `@dyel/api`'s own public surface
      (confirmed: `packages/api/src/index.ts` has no `buildDatasetsFromModel` export;
      it's only imported directly from `@dyel/pipeline` inside
      `packages/api/src/getCompetitionTotal.ts`). Swapping the import as originally
      written is impossible. Instead: add a new small wrapper to `@dyel/api` — e.g.
      `packages/api/src/chart/buildChartDatasets.ts` exporting
      `buildChartDatasets(model: PipelineModel, specs: DatasetSpec[], ui: RenderParams):
  Record<string, RechartsRow[]>`, a thin pass-through to `buildDatasetsFromModel`
      (imported directly from `@dyel/pipeline`, same documented engine-internal
      exception category as `matches`/`normalizeE1rm`/etc.) — mirroring the existing
      precedent in `getCompetitionTotal.ts`. Export it from `packages/api/src/index.ts`.
      Then repoint `usePipelineDatasets.ts` to call `buildChartDatasets` from
      `@dyel/api` instead of `buildDatasetsFromModel` from `@dyel/pipeline`, and swap
      its `DatasetSpec`/`RenderParams`/`RechartsRow` type imports to `@dyel/api` too
      (those three types genuinely are already exported as type-only re-exports, no
      issue there). (Target: `packages/api/src/chart/buildChartDatasets.ts` (new),
      `packages/api/src/index.ts`, `packages/app/src/hooks/pipeline/usePipelineDatasets.ts`,
      Test: `npm test -w packages/api && npm test -w packages/app --
  usePipelineDatasets`)
- [x] Task 23: `hooks/pipeline/usePipelineTotalChartData.ts` — swap `RenderParams`/
      `ChartPoint` types to `@dyel/api` (Target:
      `packages/app/src/hooks/pipeline/usePipelineTotalChartData.ts`, Test:
      `npm test -w packages/app -- usePipelineTotalChartData`)
- [x] Task 24: `hooks/pipeline/usePipelineDiagnostics.test.ts` — swap `PipelineModel`/
      `VariantAssessment` types to `@dyel/api` (Target:
      `packages/app/src/hooks/pipeline/usePipelineDiagnostics.test.ts`, Test:
      `npm test -w packages/app -- usePipelineDiagnostics`)

### Group B — consumers of moved logic (depends on Phase 1 Tasks 4-11)

- [x] Task 25: `hooks/pipeline/usePipelineConjugateChartData.ts` — repoint to
      `@dyel/api`'s moved `conjugateChartSpecs`/`buildBestSetByLabelAndDate` plus
      `RenderParams`/`RechartsRow`/`ChartPoint` type re-exports (Target:
      `packages/app/src/hooks/pipeline/usePipelineConjugateChartData.ts`, Test:
      `npm test -w packages/app -- usePipelineConjugateChartData`)
- [x] Task 26: `hooks/pipeline/usePipelineVariationRadarData.ts` (+ `.test.ts`) —
      repoint to `@dyel/api`'s moved `buildLastSessionDetail`,
      `snapshotVariationsFromPipeline`/`snapshotNormalizedVariationsFromPipeline`, and
      new `buildCanonicalByLabel`/`resolveTargetLabel` selectors; replace the inline
      `for` loops with calls to those; swap `RenderParams` type (Target:
      `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.ts`, Test:
      `npm test -w packages/app -- usePipelineVariationRadarData`)
- [x] Task 27: `utils/pipelineChartUtils.ts` — **delete**, repoint the consumers of
      `mergeRechartsRowsToChartPoints`/`mergeWideRechartsRows`/
      `mergeVolumeIntoChartPoints`/`formatChartDate` (grep for actual call sites at
      implementation time) to `@dyel/api`'s `chart/pipelineChartUtils.ts` (Target:
      `packages/app/src/utils/pipelineChartUtils.ts` (deleted) and its consumers,
      Test: `npm test -w packages/app`)
- [x] Task 28: Extend `hooks/pipeline/usePipelineRepCalculator.ts` per the design
      decision above, calling `@dyel/api`'s `repCalculator/repCalculatorSelectors.ts`
      and `repCalculator/repCalculatorUtils.ts`; add/extend `.test.ts` covering the
      hook's returned derived state end-to-end (Target:
      `packages/app/src/hooks/pipeline/usePipelineRepCalculator.ts`, Test:
      `npm test -w packages/app -- usePipelineRepCalculator`) — **must land before or
      paired with Task 29, not in parallel**
- [x] Task 29: Rewrite `components/shared/RepCalculator.tsx` to be render-only,
      calling the extended `usePipelineRepCalculator(tabRows, baselineNames)` hook
      from Task 28 instead of holding its own state/derivation; keep only
      `roundTo5`/`sourceNote`/`LIFT_LABELS`/JSX (Target:
      `packages/app/src/components/shared/RepCalculator.tsx`, Test:
      `npm test -w packages/app -- RepCalculator`)
- [x] Task 30: Delete now-empty `app/src/pipeline/` directory
      (`conjugateBestSet.ts(.test.ts)`, `lastSessionDetail.ts(.test.ts)`,
      `repCalculatorUtils.ts`, `conjugateChartSpecs.ts`) and its `CLAUDE.md`, once
      Tasks 25-29 confirm nothing else references it (Target:
      `packages/app/src/pipeline/` (deleted), Test:
      `npm run build -w packages/app && npm test -w packages/app`)
- [x] Task 31: Delete `app/src/utils/variationSnapshot.ts` (+ `.test.ts`), now unused
      after Task 26 (Target: `packages/app/src/utils/variationSnapshot.ts` (deleted),
      Test: `npm run build -w packages/app`)

## Verification

After every task: `npm run build -w packages/app && npm test -w packages/app`. Note
that build passing is **necessary but not sufficient** — a stray type-only
`@dyel/pipeline` import is still valid TypeScript and won't fail the build. The actual
acceptance check for the "sole boundary" rule happens in `API_PHASE_3.md`.

## Next

Once all tasks in this phase are complete and `packages/app`'s build/tests are green,
proceed to `API_PHASE_3.md`.
