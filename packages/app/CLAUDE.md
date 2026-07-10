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
- no `?page=` → `App` (main visualizer)

**Data flow (`App.tsx`):**

1. `SheetUrlPanel` offers two input modes: a Google Sheet URL or pasted free-text. Both modes resolve to a `RawInput[]` via `useResolvedRawInput`. URL mode calls `fetchSheetCsv` to retrieve the published CSV (using the dev proxy `/sheets-proxy/` during development to handle CORS); text mode directly wraps the pasted text into a `RawInput`. This raw input normalization eliminates mode-specific parsing logic downstream.
2. The resolved `RawInput[]` is passed to `runPipelineModel(raw, athlete)` from `@dyel/pipeline`, which performs all parsing, normalization, tagging, and diagnostic computation in a single call, returning a `PipelineModel`.
3. The `PipelineModel` is stored in context via `PipelineProvider` and accessed downstream via the `usePipelineModel()` hook. Child components use selector hooks (e.g., `usePipelineConjugateChartData`, `usePipelineTotalChartData`) to derive display-ready data from the model, eliminating intermediate hook-computed pair structures.
4. Exercise-type tabs (squat / bench / deadlift / accessory), `ExerciseFilters`, and `LiftTabPanel` (which composes `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel`) consume the derived data from selectors.
5. `ErrorBoundary` wraps the root in `main.tsx`.
6. Settings (`url`, `inputMode`, `pastedText`, `activeTab`, `deadliftStance`) and the last successfully resolved raw input are persisted to `localStorage` via `useLocalStorageState`, so a revisit restores the previous configuration and renders the last sheet's data instantly instead of a blank/loading state. Explicit `?sheet=`/`?mode=`/`?text=` query params always override cached settings (reconciled once on mount). The raw-data cache is keyed by the sheet URL, so switching sheets never shows stale data from a different sheet; there is no staleness/invalidation logic — users refresh manually via the existing refresh button.

**Tab state:** `App.tsx` owns a single `activeTab: PageTab` state variable that tracks the current tab. Valid values are lift types (`'squat'`, `'bench'`, `'deadlift'`, `'accessory'`) or non-lift tabs (`'sigma'` for the competition-total overview, `'calculator'` for the rep/strength-score calculators). The active tab is persisted to localStorage and restored on revisit.

**Component subdirectories** (`src/components/`):

| Subdirectory | Contents                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `charts/`    | Reusable Recharts components: `BaseRadarChart`, `DateLineChart`, `SigmaRadarChart`, `TotalChart`, `TooltipCard`, `VariationRadarChart` |
| `conjugate/` | Conjugate-feature components: `ConjugateCharts`, `ConjugateInfoPage`                                                                   |
| `pages/`     | Page/tab-panel entry points: `GettingStarted`, `IndexPage`, `LiftTabPanel`, `SigmaTab`, `ValidatorPage`                                |
| `shared/`    | Cross-feature UI: `DateRangePicker`, `DiagnosticsPanel`, `ErrorBoundary`, `ExerciseFilters`, `RepCalculator`, `SheetUrlPanel`          |

Each subdirectory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Hook subdirectories** (`src/hooks/`):

| Subdirectory | Contents                                                                             |
| ------------ | ------------------------------------------------------------------------------------ |
| `data/`      | `useIndexData`                                                                       |
| `infra/`     | `useCsvResource`, `useSheetValidation`, `useLocalStorageState`                       |
| `pipeline/`  | `usePipelineModel`, `usePipelineConjugateChartData`, `usePipelineVariationRadarData` |

Each subdirectory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Key modules:**

| Path                                                  | Purpose                                                                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/appUtils.ts`                               | Pure helpers (`extractSheetRef`), type aliases (`LiftType`, `PageTab`), and URL/tab constants — no React dependency                                                                                                    |
| `src/components/charts/BaseRadarChart.tsx`            | Shared Recharts radar wrapper; accepts `angleKey`, `unit`, `tooltip`, optional `onClick`                                                                                                                               |
| `src/components/pages/SigmaTab.tsx`                   | "Σ" overview tab: `TotalChart` + `SessionBarChart` + `SigmaRadarChart` across all lift types                                                                                                                           |
| `src/components/pages/LiftTabPanel.tsx`               | Per-lift tab content: `ConjugateCharts` + `VariationRadarChart` with shared variation-highlight state                                                                                                                  |
| `src/components/shared/RepCalculator.tsx`             | Calculator tab: predicts weight-for-reps and reps-for-weight using pipeline-native `findBestE1RMFromPipeline` via `usePipelineModel()`                                                                                 |
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

- **Model** = `@dyel/pipeline`'s `runPipelineModel(raw, athlete): PipelineModel` (parse → tag → normalize → diagnose), executed once per raw-input/athlete change. Owned by `PipelineProvider` in `src/context/PipelineContext.tsx` and accessed via the `usePipelineModel()` hook.
- **Controller** = `hooks/pipeline/*` selectors (e.g. `usePipelineDatasets`, `usePipelineTotalChartData`, `usePipelineDiagnostics`, `usePipelineRepCalculator`) that read the shared `PipelineModel`, plus non-hook view-derivation helpers in `src/pipeline/*.ts` (chart specs, `lastSessionDetail.ts`, `repCalculatorUtils.ts`, `variationSnapshot.ts`). These are pure functions with no React dependency.
- **View** = `components/**`, render-only, no direct `@dyel/core`/`@dyel/pipeline` imports.

The `src/pipeline/` directory remains named `pipeline/` and is not renamed to `views/` or `selectors/` — subdirectories are documented per-file via existing `CLAUDE.md` files, and a rename would unnecessarily churn existing migration docs (#459, #460, #461) with no functional gain.

## Constraints

**Published sheets only.** Only support features that work with published Google Sheets (`/pub?output=csv`). Do not add features that require the `/export?format=csv` endpoint — it only works for sheets that are publicly accessible without publishing, which is a rare configuration.

## Vitest / Vite config split (required)

Keep Vitest config in a **separate `vitest.config.ts`** — never embed a `test:` block in `vite.config.ts`.

**Why:** Vitest 3 bundles its own Vite 7, whose types conflict with this project's Vite 8. `tsconfig.node.json` only includes `vite.config.ts`, so a standalone `vitest.config.ts` is never processed by `tsc -b` and the type mismatch is avoided. Tracked in issues #15 (bug) and #16 (fix).

**Rules:**

- `vite.config.ts` must have no `test:` block and no `/// <reference types="vitest" />`
- `vitest.config.ts` must import `defineConfig` from `vitest/config` and own all `test` config
- Verify this before pushing any new CI workflow — violating it causes `tsc -b` to fail with `'test' does not exist in type 'UserConfigExport'`
