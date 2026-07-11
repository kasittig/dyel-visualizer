# CLAUDE.md

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # tsc -b && vite build
npm test          # vitest run --passWithNoTests
```

Set `VITE_SHEET_URL` in `.env.local` to pre-fill the sheet URL input during development (see `.env.example`).

## Architecture

Single-page React app with no backend. Data comes from either a user-supplied Google Sheet URL or pasted free-text (both are input modes on `SheetUrlPanel`). There is no router — page selection is done via `?page=` query params (or matching path segment) in `main.tsx`.

**Page routing (`main.tsx`):**

- `?page=conjugate` (or `/conjugate`) → `ConjugateInfoPage` (renders `CONJUGATE.md` as markdown)
- `?page=index` (or `/index`) → `IndexPage` (list of linked sheets fetched from a hardcoded published index sheet)
- `?page=validator` (or `/validator`) → `ValidatorPage` (sheet/pasted-text structural validation)
- `?page=pipeline-validation` (or `/pipeline-validation`) → `PipelineValidationPage` (parse errors, unknown exercises, normalization issues via `runPipeline`)
- no `?page=` → `App` (main visualizer)

**Data flow (`app/App.tsx` composing `app/*` hooks):**

1. `useAppSettings()` owns all settings state (`url`, `inputMode`, `pastedText`, `activeTab`, `deadliftStance`, date range, transient UI state), the query-param → localStorage reconciliation, the URL-sync effect, and the `athlete` memo.
2. `usePipelineOrchestration(inputMode, url, pastedText, refreshToken, athlete)` resolves a `RawInput[]` via `useResolvedRawInput` (`features/data-source/`) (URL mode calls `fetchSheetCsv` to retrieve the published CSV, using the dev proxy `/sheets-proxy/` during development to handle CORS; text mode directly wraps the pasted text into a `RawInput`), then passes it to `buildPipelineModel(raw, athlete)` from `@dyel/api` (a thin wrapper over `@dyel/pipeline`'s `runPipelineModel`, which performs all parsing, normalization, tagging, and diagnostic computation in a single call), returning a `PipelineModel`. It also owns the raw-data cache (keyed by sheet URL, persisted to `localStorage`) so a revisit renders the last sheet's data instantly instead of a blank/loading state — explicit `?sheet=`/`?mode=`/`?text=` query params always override cached settings.
3. `useVisualizerData(model, dateRange, deadliftStance)` derives `tabRows`, visible-lift-type filtering, default canonicals, display unit, and volume/session-date data via `@dyel/api` selectors.
4. The `PipelineModel` is stored in context via `PipelineProvider` and accessed downstream via the `usePipelineModel()` hook (both in `app/PipelineContext.tsx`). Child components use selector hooks from their owning feature directory (e.g., `features/lift/usePipelineConjugateChartData`, `features/sigma/usePipelineTotalChartData`) to derive display-ready data from the model.
5. Exercise-type tabs (squat / bench / deadlift / accessory) render `features/lift/LiftTabPanel` (which composes `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel`, all colocated in `features/lift/`) consuming the derived data from selectors.
6. `shared/components/ErrorBoundary` wraps the root in `main.tsx`.

**Tab state:** `app/App.tsx` owns a single `activeTab: PageTab` state variable that tracks the current tab. Valid values are lift types (`'squat'`, `'bench'`, `'deadlift'`, `'accessory'`) or non-lift tabs (`'sigma'` for the competition-total overview, `'calculator'` for the rep/strength-score calculators). The active tab is persisted to localStorage and restored on revisit.

**Directory layout** (`src/`, per-feature, flat — no `components/`/`hooks/` subdirs within a feature):

| Directory                  | Contents                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                     | `App.tsx`, `PipelineContext.tsx` (`PipelineProvider`/`usePipelineModel`), `useAppSettings`, `usePipelineOrchestration`, `useVisualizerData`, `appTabs.ts` (`PageTab`/`InputMode`/`DeadliftStancePreference` types + `MAIN_TABS`)                |
| `features/data-source/`    | `SheetUrlPanel`, `InputModeToggle`, `GettingStarted`, `useResolvedRawInput`, `rawInput.ts`, `sheetRef.ts`, `sheetFetch.ts`, `sheetCacheUtils.ts`                                                                                                |
| `features/validation/`     | `ValidatorPage`, `PipelineValidationPage`, `useSheetValidation`, `useTextValidation`, `usePipelineValidation`                                                                                                                                   |
| `features/calculator/`     | `RepCalculator`, `usePipelineRepCalculator`, `StrengthScoreCalculator`, `useStrengthScores`                                                                                                                                                     |
| `features/sigma/`          | `SigmaTab`, `SigmaChart`, `TotalChart`, `SessionBarChart`, `usePipelineTotalChartData`, `usePipelineDatasets`, `useSigmaChartData`                                                                                                              |
| `features/lift/`           | `LiftTabPanel`, `ConjugateCharts`, `usePipelineConjugateChartData`, `VariationRadarChart`, `usePipelineVariationRadarData`, `DiagnosticsPanel`, `usePipelineDiagnostics`                                                                        |
| `features/conjugate-info/` | `ConjugateInfoPage`                                                                                                                                                                                                                             |
| `features/index-page/`     | `IndexPage`, `useIndexData`, `parseIndexCsv`                                                                                                                                                                                                    |
| `shared/charts/`           | Reusable Recharts components: `BaseRadarChart`, `DateLineChart` (+`ChartEmpty`), `TooltipCard` (+`ChartTooltip`), `colors.ts`, `CONVENTIONS.md`, `charts.module.css` (shared CSS module `composes`d by feature-owned chart `.module.css` files) |
| `shared/components/`       | Cross-feature UI: `CollapsibleSection`, `DateRangePicker`, `EditableDateChip`, `ErrorBoundary`                                                                                                                                                  |
| `shared/hooks/`            | `useCsvResource`, `useLocalStorageState`                                                                                                                                                                                                        |
| `shared/dateUtils.ts`      | Pure date-formatting helpers — no React dependency                                                                                                                                                                                              |

Each `features/*/` and `shared/*/` directory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Dev proxy:** `vite.config.ts` defines a `sheetsProxyPlugin` that forwards `/sheets-proxy/*` to `https://docs.google.com/*` using Node's `fetch`, which follows redirects server-side and avoids CORS issues. In production `fetchSheetCsv` hits Google directly — this only works with published sheets.

## MVC mapping

The app follows an MVC-like separation:

- **Model** = `@dyel/api`'s `buildPipelineModel(raw, athlete): PipelineModel` (thin wrapper over `@dyel/pipeline`'s `runPipelineModel`; parse → tag → normalize → diagnose), executed once per raw-input/athlete change inside `app/usePipelineOrchestration.ts`. Owned by `PipelineProvider` in `app/PipelineContext.tsx` and accessed via the `usePipelineModel()` hook.
- **Controller** = `app/*` (settings/orchestration/visualizer-data, called from `App.tsx`) and each feature directory's `use*` selector hooks (e.g. `features/sigma/usePipelineDatasets`, `features/sigma/usePipelineTotalChartData`, `features/lift/usePipelineDiagnostics`, `features/calculator/usePipelineRepCalculator`) that consume the shared `PipelineModel` and delegate their actual derivation logic to `@dyel/api`. They act as thin wrappers around `@dyel/api` selectors and utilities, handling React state/lifecycle while `@dyel/api` owns business logic. `@dyel/api` is now the sole boundary — no `packages/app` production file imports `@dyel/pipeline` directly (only `features/lift/usePipelineVariationRadarData.test.ts` does, for real-fixture `PipelineModel` test coverage; allowlisted in `eslint.config.js`).
- **View** = feature components and `shared/charts/`, `shared/components/`, render-only, no direct `@dyel/pipeline` imports.

This directory layout (`app/`, `features/*/`, `shared/*/`) is the result of Phase 4 of the
App Refactor migration (file moves only, see `HANDOFF.md`) — it replaced the earlier
`src/components/`, `src/hooks/`, `src/context/`, `src/utils/` structure. `src/pipeline/`
(an even earlier, non-hook view-derivation helpers directory) was deleted in Phase 2 of the
`@dyel/api`-as-sole-boundary migration; that logic now lives in `@dyel/api`.

## Constraints

**Published sheets only.** Only support features that work with published Google Sheets (`/pub?output=csv`). Do not add features that require the `/export?format=csv` endpoint — it only works for sheets that are publicly accessible without publishing, which is a rare configuration.

## Vitest / Vite config split (required)

Keep Vitest config in a **separate `vitest.config.ts`** — never embed a `test:` block in `vite.config.ts`.

**Why:** Vitest 3 bundles its own Vite 7, whose types conflict with this project's Vite 8. `tsconfig.node.json` only includes `vite.config.ts`, so a standalone `vitest.config.ts` is never processed by `tsc -b` and the type mismatch is avoided. Tracked in issues #15 (bug) and #16 (fix).

**Rules:**

- `vite.config.ts` must have no `test:` block and no `/// <reference types="vitest" />`
- `vitest.config.ts` must import `defineConfig` from `vitest/config` and own all `test` config
- Verify this before pushing any new CI workflow — violating it causes `tsc -b` to fail with `'test' does not exist in type 'UserConfigExport'`
