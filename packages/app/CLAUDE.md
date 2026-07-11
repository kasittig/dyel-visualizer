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

**Data flow (`App.tsx` composing `hooks/app/*`):**

1. `useAppSettings()` owns all settings state (`url`, `inputMode`, `pastedText`, `activeTab`, `deadliftStance`, date range, transient UI state), the query-param → localStorage reconciliation, the URL-sync effect, and the `athlete` memo.
2. `usePipelineOrchestration(inputMode, url, pastedText, refreshToken, athlete)` resolves a `RawInput[]` via `useResolvedRawInput` (URL mode calls `fetchSheetCsv` to retrieve the published CSV, using the dev proxy `/sheets-proxy/` during development to handle CORS; text mode directly wraps the pasted text into a `RawInput`), then passes it to `buildPipelineModel(raw, athlete)` from `@dyel/api` (a thin wrapper over `@dyel/pipeline`'s `runPipelineModel`, which performs all parsing, normalization, tagging, and diagnostic computation in a single call), returning a `PipelineModel`. It also owns the raw-data cache (keyed by sheet URL, persisted to `localStorage`) so a revisit renders the last sheet's data instantly instead of a blank/loading state — explicit `?sheet=`/`?mode=`/`?text=` query params always override cached settings.
3. `useVisualizerData(model, dateRange, deadliftStance)` derives `tabRows`, visible-lift-type filtering, default canonicals, display unit, and volume/session-date data via `@dyel/api` selectors.
4. The `PipelineModel` is stored in context via `PipelineProvider` and accessed downstream via the `usePipelineModel()` hook. Child components use selector hooks (e.g., `usePipelineConjugateChartData`, `usePipelineTotalChartData`) to derive display-ready data from the model, eliminating intermediate hook-computed pair structures.
5. Exercise-type tabs (squat / bench / deadlift / accessory) and `LiftTabPanel` (which composes `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel`) consume the derived data from selectors.
6. `ErrorBoundary` wraps the root in `main.tsx`.

**Tab state:** `App.tsx` owns a single `activeTab: PageTab` state variable that tracks the current tab. Valid values are lift types (`'squat'`, `'bench'`, `'deadlift'`, `'accessory'`) or non-lift tabs (`'sigma'` for the competition-total overview, `'calculator'` for the rep/strength-score calculators). The active tab is persisted to localStorage and restored on revisit.

**Component subdirectories** (`src/components/`):

| Subdirectory | Contents                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `charts/`    | Reusable Recharts components: `BaseRadarChart`, `DateLineChart`, `SessionBarChart`, `SigmaChart`, `TooltipCard`, `TotalChart`, `VariationRadarChart` |
| `conjugate/` | Conjugate-feature components: `ConjugateCharts`, `ConjugateInfoPage`                                                                                 |
| `pages/`     | Page/tab-panel entry points: `GettingStarted`, `IndexPage`, `LiftTabPanel`, `PipelineValidationPage`, `SigmaTab`, `ValidatorPage`                    |
| `shared/`    | Cross-feature UI: `DateRangePicker`, `DiagnosticsPanel`, `ErrorBoundary`, `RepCalculator`, `SheetUrlPanel`, `StrengthScoreCalculator`                |

Each subdirectory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Hook subdirectories** (`src/hooks/`):

| Subdirectory | Contents                                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/`       | `useAppSettings` (settings state + localStorage sync + handlers), `usePipelineOrchestration` (raw input → `buildPipelineModel` → effective status/model), `useVisualizerData` (tabRows/canonicals/date-filtered visibility/volume/session-date derivations) — all extracted from `App.tsx` |
| `data/`      | `useIndexData`                                                                                                                                                                                                                                                                             |
| `infra/`     | `useCsvResource`, `useSheetValidation`, `useTextValidation`, `usePipelineValidation`, `useLocalStorageState`                                                                                                                                                                               |
| `pipeline/`  | `usePipelineDatasets`, `usePipelineConjugateChartData`, `usePipelineVariationRadarData`, `usePipelineDiagnostics`, `usePipelineRepCalculator`, `usePipelineTotalChartData` (`usePipelineModel` itself lives in `src/context/PipelineContext.tsx`, not this directory)                      |

Each subdirectory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Key modules:**

| Path                                                  | Purpose                                                                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/sheetRef.ts`                               | Pure `extractSheetRef` helper + example sheet URL constants — no React dependency                                                                                                                                      |
| `src/utils/appTabs.ts`                                | UI type aliases (`PageTab`, `InputMode`, `DeadliftStancePreference`) and the `MAIN_TABS` tab-nav constant — no React dependency                                                                                        |
| `src/utils/rawInput.ts`                               | Pure `buildRawInput`/`PLACEHOLDER_ATHLETE` — no React dependency                                                                                                                                                       |
| `src/utils/useResolvedRawInput.ts`                    | React hook resolving `RawInput[]` from either input mode (CSV fetch or pasted text)                                                                                                                                    |
| `src/components/charts/BaseRadarChart.tsx`            | Shared Recharts radar wrapper; accepts `angleKey`, `unit`, `tooltip`, optional `onClick`                                                                                                                               |
| `src/components/pages/SigmaTab.tsx`                   | "Σ" overview tab: `TotalChart` + `SessionBarChart` + `SigmaChart` across all lift types                                                                                                                                |
| `src/components/pages/LiftTabPanel.tsx`               | Per-lift tab content: `ConjugateCharts` + `VariationRadarChart` with shared variation-highlight state                                                                                                                  |
| `src/components/shared/RepCalculator.tsx`             | Calculator tab: render-only component displaying Rep Calculator UI; logic (state, e1RM estimation, weight-for-reps/reps-for-weight derivation) owned by `usePipelineRepCalculator` hook via `@dyel/api`                |
| `src/components/shared/DiagnosticsPanel.tsx`          | Diagnostics panel using `usePipelineDiagnostics()` (pipeline-native, all-time not date-range-filtered; surfaces `'stale'` status for variants past the staleness threshold)                                            |
| `src/components/shared/DateRangePicker.tsx`           | Date range input using `react-day-picker` + Radix Popover                                                                                                                                                              |
| `src/components/pages/IndexPage.tsx`                  | Landing page listing linked sheets; fetches from a hardcoded published index sheet via `useIndexData`                                                                                                                  |
| `src/hooks/pipeline/usePipelineConjugateChartData.ts` | All data aggregation for `ConjugateCharts` (grouping, normalization, forward-fill); the component itself is presentation-only                                                                                          |
| `src/hooks/data/useIndexData.ts`                      | Fetches and parses the published index sheet CSV; returns `IndexEntry[]`                                                                                                                                               |
| `src/utils/sheetCacheUtils.ts`                        | Pure serialize/deserialize helpers for caching resolved `RawInput[]` to localStorage (handles `Date` round-tripping)                                                                                                   |
| `src/utils/sheetFetch.ts`                             | CSV fetching utilities: `sheetCsvUrl` constructs the appropriate Google Sheets URL (dev proxy or production), `fetchSheetCsv` retrieves the CSV with error handling, `csvFetchError` maps HTTP status to user messages |

**Dev proxy:** `vite.config.ts` defines a `sheetsProxyPlugin` that forwards `/sheets-proxy/*` to `https://docs.google.com/*` using Node's `fetch`, which follows redirects server-side and avoids CORS issues. In production `fetchSheetCsv` hits Google directly — this only works with published sheets.

## MVC mapping

The app follows an MVC-like separation:

- **Model** = `@dyel/api`'s `buildPipelineModel(raw, athlete): PipelineModel` (thin wrapper over `@dyel/pipeline`'s `runPipelineModel`; parse → tag → normalize → diagnose), executed once per raw-input/athlete change inside `hooks/app/usePipelineOrchestration.ts`. Owned by `PipelineProvider` in `src/context/PipelineContext.tsx` and accessed via the `usePipelineModel()` hook.
- **Controller** = `hooks/app/*` (settings/orchestration/visualizer-data, called from `App.tsx`) and `hooks/pipeline/*` selector hooks (e.g. `usePipelineDatasets`, `usePipelineTotalChartData`, `usePipelineDiagnostics`, `usePipelineRepCalculator`) that consume the shared `PipelineModel` and delegate their actual derivation logic to `@dyel/api`. They act as thin wrappers around `@dyel/api` selectors and utilities, handling React state/lifecycle while `@dyel/api` owns business logic. `@dyel/api` is now the sole boundary — no `packages/app` production file imports `@dyel/pipeline` directly (only `hooks/pipeline/usePipelineVariationRadarData.test.ts` does, for real-fixture `PipelineModel` test coverage).
- **View** = `components/**`, render-only, no direct `@dyel/pipeline` imports.

`src/pipeline/` (the non-hook view-derivation helpers this paragraph used to describe) was
deleted in Phase 2 of the `@dyel/api`-as-sole-boundary migration (see `HANDOFF.md`) — that
logic now lives in `@dyel/api`. `src/hooks/pipeline/` (the Controller hooks directory) is
unaffected and keeps its name.

## Constraints

**Published sheets only.** Only support features that work with published Google Sheets (`/pub?output=csv`). Do not add features that require the `/export?format=csv` endpoint — it only works for sheets that are publicly accessible without publishing, which is a rare configuration.

## Vitest / Vite config split (required)

Keep Vitest config in a **separate `vitest.config.ts`** — never embed a `test:` block in `vite.config.ts`.

**Why:** Vitest 3 bundles its own Vite 7, whose types conflict with this project's Vite 8. `tsconfig.node.json` only includes `vite.config.ts`, so a standalone `vitest.config.ts` is never processed by `tsc -b` and the type mismatch is avoided. Tracked in issues #15 (bug) and #16 (fix).

**Rules:**

- `vite.config.ts` must have no `test:` block and no `/// <reference types="vitest" />`
- `vitest.config.ts` must import `defineConfig` from `vitest/config` and own all `test` config
- Verify this before pushing any new CI workflow — violating it causes `tsc -b` to fail with `'test' does not exist in type 'UserConfigExport'`
