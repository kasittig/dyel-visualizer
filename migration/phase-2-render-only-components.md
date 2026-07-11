# Phase 2 — Repoint hooks + make components render-only

Objective: every component under `packages/app/src/components` becomes render-only; all derivation moved in Phase 1 is now consumed from `@dyel/api`; app-side duplicates deleted. No file moves (Phase 4 does that). No App.tsx changes (Phase 3 does that).

Prerequisite: Phase 1 merged. Each task is independent unless noted; each needs only the listed files + the invariants block in `migration/README.md`.

---

## Task 2.1 — weightUnit dedup

- Delete `packages/app/src/utils/weightUnit.ts` and `weightUnit.test.ts` (api now owns both, per Task 1.1).
- Repoint every app import of `utils/weightUnit` to `@dyel/api` (grep `from '.*weightUnit'` under `packages/app/src`).
- Done when: app build + tests green, no file named weightUnit under packages/app.

## Task 2.2 — SigmaChart render-only

- Read: `packages/app/src/components/charts/SigmaChart.tsx`.
- Replace the forward-fill `useMemo` (~lines 17–44) with a single `useMemo(() => latestLiftE1RMs(chartData), [chartData])` using `@dyel/api`.
- Done when: component contains no data transformation beyond that one call; visual behavior unchanged.

## Task 2.3 — VariationRadarChart render-only

- Read: `packages/app/src/components/charts/VariationRadarChart.tsx`.
- Replace the reshape/sort/filter `useMemo` (~lines 33–47) with `buildRadarRows(normalizedSnapshot)` from `@dyel/api`. Tooltip date/weight display formatting stays.
- Done when: no array-shaping logic remains in the component.

## Task 2.4 — DiagnosticsPanel + usePipelineDiagnostics

- Read: `packages/app/src/components/shared/DiagnosticsPanel.tsx`, `packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts` + its test.
- Do:
  - Hook body becomes `useMemo(() => selectDiagnosticVariants(model, liftType), [model, liftType])` (add the memo — today it isn't memoized).
  - Panel's weak/overtrained `useMemo` (~46–67) → `summarizeEffects(variants)`; local `formatEffect`/`formatAddlWtOffset` → imports from `@dyel/api`.
  - Shrink `usePipelineDiagnostics.test.ts` to wiring-level or delete (logic assertions were ported to api in Task 1.4); note the test-count delta for HANDOFF.md.
  - Status→color/label mapping stays in the component (UI).

## Task 2.5 — usePipelineConjugateChartData slimming

- Read: `packages/app/src/hooks/pipeline/usePipelineConjugateChartData.ts` (+ test if any).
- Replace the in-hook merge/dedupe/rounding (~lines 59–99) with `buildConjugateChartData(...)` + `roundBestSetsForDisplay(...)` from `@dyel/api`; also use `dateRangeToRenderParams(dateRange?.from, dateRange?.to)` for the RenderParams conversion.
- Resulting hook: context read → `usePipelineDatasets` → one `useMemo` with the two api calls.
- Done when: `ConjugateCharts` renders identically (team-lead smoke-checks lift tabs).

## Task 2.6 — usePipelineTotalChartData RenderParams dedup

- Read: `packages/app/src/hooks/pipeline/usePipelineTotalChartData.ts`.
- Replace the inline dateRange→RenderParams block (~lines 50–56) with `dateRangeToRenderParams` from `@dyel/api`. Nothing else changes.

## Task 2.7 — StrengthScoreCalculator render-only + hook

- Read: `packages/app/src/components/shared/StrengthScoreCalculator.tsx`.
- Do:
  - Create `packages/app/src/hooks/pipeline/useStrengthScores.ts`: thin hook reading `usePipelineModel()` and memoizing the `computeStrengthScores`/`getCompetitionTotal` calls the component makes today (component currently reads context directly — that moves into this hook; local bodyweight/unit/gender state STAYS in the component and is passed as args).
  - In the component: replace local `tierInfo` percentile thresholds with `strengthTierForPercentile` from `@dyel/api`; keep tier→color mapping + `ordinal()` local.
- Done when: component imports no `@dyel/api` derivation functions except display constants, and does not call `usePipelineModel()`.

## Task 2.8 — DateRangePicker date math

- Read: `packages/app/src/components/shared/DateRangePicker.tsx` (305 lines).
- Replace `PRESETS[].getRange` arithmetic and the preset-active matching with `presetDateRange`/`activePreset` from `@dyel/api`. Preset labels, popover/focus/click-outside handling, and text sync all stay.
- Done when: preset buttons behave identically (team-lead smoke-checks presets + custom range).

## Task 2.9 — PipelineValidationPage verdict

- Read: `packages/app/src/components/pages/PipelineValidationPage.tsx`.
- Replace the inline verdict derivation (~lines 114–120) with `classifyPipelineVerdict(result)` from `@dyel/api`. Verdict→message/style mapping stays.

## Task 2.10 — SigmaTab inline api call → hook

- Read: `packages/app/src/components/pages/SigmaTab.tsx`.
- Create `packages/app/src/hooks/pipeline/useSigmaChartData.ts`: wraps `usePipelineTotalChartData` and memoizes `mergeVolumeIntoChartPoints(pipelineChartData, volumeByDate)` (currently called inline in SigmaTab's render body) plus `latestLiftE1RMs` if SigmaChart's caller wants it precomputed. SigmaTab consumes the hook; no api value imports remain in the component.

## Task 2.11 — RepCalculator roundTo5 (minimal — DO NOT restructure)

- Read: `packages/app/src/hooks/pipeline/usePipelineRepCalculator.ts` (186 lines; flagged highest-risk in HANDOFF.md).
- ONLY change: replace local `roundTo5` with the api function decided in Task 1.6c (either `roundWeight` or the new `roundTo5`). Touch nothing else — the useState/useEffect/ref reps↔weight sync is legitimately React and stays.
- Done when: `usePipelineRepCalculator.test.ts` still passes unchanged.

## Task 2.12 — Delete app-side validators

- Delete `packages/app/src/utils/validators/` (both validators + tests — api owns them per Task 1.8).
- Repoint consumers: `packages/app/src/hooks/infra/useSheetValidation.ts` and `useTextValidation.ts` import `validateSheetCsv`/`validateTextData` from `@dyel/api`.
- Done when: app builds; both validator flows work (team-lead smoke-checks `?page=` validator routes).

---

## Phase verification (team-lead)

1. All builds + tests green across packages; record test-count deltas.
2. Grep check: no `useMemo` doing multi-line data transformation inside `packages/app/src/components/**` (visual scan of the 6 touched components).
3. run-dyel-visualizer smoke: Σ tab, each lift tab (charts + radar + diagnostics), Calculator tab (rep calc + strength scores), both validator pages, date-range presets.
