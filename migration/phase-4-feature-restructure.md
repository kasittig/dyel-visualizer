# Phase 4 — features/ restructure (file moves ONLY, zero logic change)

Objective: reorganize `packages/app/src` by domain feature. Every task is `git mv` + import-path updates + barrel creation. **No function bodies change.** Use `git mv` so history follows.

Prerequisite: Phases 1–3 merged.

Delegation note: tasks 4.1–4.8 each own a destination directory and the files moving into it. They can run sequentially in one worktree or be batched; import-path fixups for files that OTHER tasks moved are resolved by running the build at the end (Task 4.9 sweeps). Each moved dir gets an `index.ts` barrel exporting its public pieces; per-dir `CLAUDE.md` content migrates with its files.

## Target tree

```
src/
  main.tsx, index.css, assets/
  app/            App.tsx(.module.css), PipelineContext.tsx(+test),
                  useAppSettings.ts, usePipelineOrchestration.ts, useVisualizerData.ts, appTabs.ts
  features/
    data-source/  SheetUrlPanel, InputModeToggle, GettingStarted,
                  useResolvedRawInput.ts, rawInput.ts(+test), sheetRef.ts(+test),
                  sheetFetch.ts(+test), sheetCacheUtils.ts(+test)
    validation/   ValidatorPage, PipelineValidationPage,
                  useSheetValidation.ts, useTextValidation.ts, usePipelineValidation.ts
    calculator/   RepCalculator, usePipelineRepCalculator(+test),
                  StrengthScoreCalculator, useStrengthScores.ts
    sigma/        SigmaTab, SigmaChart, TotalChart, SessionBarChart,
                  usePipelineTotalChartData.ts, usePipelineDatasets(+test), useSigmaChartData.ts
    lift/         LiftTabPanel, ConjugateCharts, usePipelineConjugateChartData.ts,
                  VariationRadarChart, usePipelineVariationRadarData(+test),
                  DiagnosticsPanel, usePipelineDiagnostics(+test)
    conjugate-info/ ConjugateInfoPage
    index-page/   IndexPage, useIndexData.ts, parseIndexCsv(+test)
  shared/
    charts/       BaseRadarChart, DateLineChart, TooltipCard, colors.ts, CONVENTIONS.md
    components/   CollapsibleSection, ErrorBoundary, EditableDateChip, DateRangePicker
    hooks/        useCsvResource.ts, useLocalStorageState.ts
    dateUtils.ts(+test)
```

(Each component brings its `.module.css`. Features stay FLAT — no components/ or hooks/ subdirs.)

## Tasks

- **4.1 `src/app/`** — move App.tsx + module.css, `context/PipelineContext.tsx`(+test), the three `hooks/app/*` hooks, `utils/appTabs.ts`. Update `main.tsx` import of App.
- **4.2 `features/data-source/`** — move the files listed above from `components/shared/`, `components/pages/GettingStarted.tsx`, `utils/` (rawInput, sheetRef, sheetFetch, sheetCacheUtils, useResolvedRawInput).
- **4.3 `features/validation/`** — move ValidatorPage, PipelineValidationPage from `components/pages/`, the three validation hooks from `hooks/infra/`. Update `main.tsx` lazy-import paths for the `?page=` routes.
- **4.4 `features/calculator/`** — move RepCalculator, StrengthScoreCalculator from `components/shared/`, their two hooks from `hooks/pipeline/`.
- **4.5 `features/sigma/` + `features/lift/`** — move the chart pages/components and their hooks per the tree. `LiftTabPanel` comes from `components/pages/`.
- **4.6 `features/conjugate-info/` + `features/index-page/`** — move ConjugateInfoPage (fix its `../../../CONJUGATE.md?raw` relative depth — the file stays at `packages/app/CONJUGATE.md`), IndexPage + useIndexData + parseIndexCsv. Update `main.tsx` lazy imports.
- **4.7 `shared/`** — move chart primitives (BaseRadarChart, DateLineChart, TooltipCard, colors.ts, CONVENTIONS.md), CollapsibleSection, ErrorBoundary, EditableDateChip, DateRangePicker, useCsvResource, useLocalStorageState, dateUtils.
- **4.8 Barrels + CLAUDE.md** — `index.ts` per feature/shared dir; distribute content of the old `components/*/CLAUDE.md` and `hooks/*/CLAUDE.md` into the new dirs; delete now-empty `components/`, `hooks/`, `context/`, `utils/` dirs.
- **4.9 Sweep** — `npm run build -w packages/app` + `npm run test -w packages/app`; fix any missed import paths (including test fixture relative paths like `../../../test/fixtures/…`).

## Phase verification (team-lead)

1. Builds + tests green; `npx eslint packages/app` clean.
2. Smoke every `?page=` route (exercises the lazy chunks) + main visualizer tabs.
3. `git log --follow` on one moved file (e.g. RepCalculator.tsx) confirms rename detection.
4. Diff review: zero changes inside function bodies (moves + import lines + barrels only).
