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

1. `SheetUrlPanel` offers two input modes: a Google Sheet URL (`extractSheetRef()` → `useConjugateData()`, which fetches the sheet as CSV and calls `parseConjugateData` from `@dyel/core`) or pasted free-text (parsed via `parseTextData` from `@dyel/core`). `App.tsx` picks whichever mode is active and normalizes both into the same `ConjugateDataState` shape.
2. The resulting `ConjugateDataPair[]` flows through exercise-type tabs (squat / bench / deadlift / accessory), `ExerciseFilters`, and `LiftTabPanel` (which composes `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel`)
3. `useLastSessionStats` computes per-exercise stats from the pair list — e1RM, last session, predicted e1RM, variant factors, resistance offsets
4. `ErrorBoundary` wraps the root in `main.tsx`
5. Settings (`url`, `inputMode`, `pastedText`, `activeTab`, `tabState`, `deadliftStance`) and the last successfully fetched sheet's `ConjugateDataPair[]` are persisted to `localStorage` via `useLocalStorageState`, so a revisit restores the previous configuration and renders the last sheet's data instantly instead of a blank/loading state. Explicit `?sheet=`/`?mode=`/`?text=` query params always override cached settings (reconciled once on mount). The sheet-data cache is keyed by the sheet URL, so switching sheets never shows stale data from a different sheet; there is no staleness/invalidation logic — users refresh manually via the existing refresh button.

**Tab state:** `App.tsx` owns `tabState: Record<LiftType, TabState>` (initialized via `initialTabState()`). Active non-lift tabs: `"sigma"` and `"calculator"`.

**Component subdirectories** (`src/components/`):

| Subdirectory | Contents                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `charts/`    | Reusable Recharts components: `BaseRadarChart`, `DateLineChart`, `SigmaRadarChart`, `TotalChart`, `TooltipCard`, `VariationRadarChart` |
| `conjugate/` | Conjugate-feature components: `ConjugateCharts`, `ConjugateInfoPage`                                                                   |
| `pages/`     | Page/tab-panel entry points: `GettingStarted`, `IndexPage`, `LiftTabPanel`, `SigmaTab`, `ValidatorPage`                                |
| `shared/`    | Cross-feature UI: `DateRangePicker`, `DiagnosticsPanel`, `ErrorBoundary`, `ExerciseFilters`, `RepCalculator`, `SheetUrlPanel`          |

Each subdirectory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Hook subdirectories** (`src/hooks/`):

| Subdirectory | Contents                                                            |
| ------------ | ------------------------------------------------------------------- |
| `conjugate/` | `useConjugateData`, `useConjugateChartData`                         |
| `data/`      | `useBaselineTargetExercises`, `useIndexData`, `useLastSessionStats` |
| `infra/`     | `useCsvResource`, `useSheetValidation`, `useLocalStorageState`      |

Each subdirectory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Key modules:**

| Path                                           | Purpose                                                                                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/utils/appUtils.ts`                        | Pure helpers (`extractSheetRef`, `toggleInSet`, `initialTabState`), type aliases (`LiftType`, `PageTab`, `TabState`), and URL/tab constants — no React dependency                                                  |
| `src/components/charts/BaseRadarChart.tsx`     | Shared Recharts radar wrapper; accepts `angleKey`, `unit`, `tooltip`, optional `onClick`                                                                                                                           |
| `src/components/pages/SigmaTab.tsx`            | "Σ" overview tab: `TotalChart` + `SessionBarChart` + `SigmaRadarChart` across all lift types                                                                                                                       |
| `src/components/pages/LiftTabPanel.tsx`        | Per-lift tab content: `ConjugateCharts` + `VariationRadarChart` with shared variation-highlight state                                                                                                              |
| `src/components/shared/RepCalculator.tsx`      | Calculator tab: predicts weight-for-reps and reps-for-weight using `findBestE1RM` from `@dyel/core`                                                                                                                |
| `src/components/shared/DiagnosticsPanel.tsx`   | Diagnostics panel using `generateDiagnostics` from `@dyel/core`                                                                                                                                                    |
| `src/components/shared/DateRangePicker.tsx`    | Date range input using `react-day-picker` + Radix Popover                                                                                                                                                          |
| `src/components/pages/IndexPage.tsx`           | Landing page listing linked sheets; fetches from a hardcoded published index sheet via `useIndexData`                                                                                                              |
| `src/hooks/data/useBaselineTargetExercises.ts` | Exports pure `computeBaselineTargetExercises` (for use outside React, e.g. tests) plus a `useMemo`-wrapped hook; builds `baselineExByType` and `targetExByType` maps; shared by `TotalChart` and `SigmaRadarChart` |
| `src/hooks/conjugate/useConjugateChartData.ts` | All data aggregation for `ConjugateCharts` (grouping, normalization, forward-fill); the component itself is presentation-only                                                                                      |
| `src/hooks/data/useIndexData.ts`               | Fetches and parses the published index sheet CSV; returns `IndexEntry[]`                                                                                                                                           |
| `src/utils/sheetCacheUtils.ts`                 | Pure serialize/deserialize helpers for caching `ConjugateDataPair[]` to localStorage (handles `Date` round-tripping)                                                                                               |
| `src/testUtils/compareChartSeries.ts`          | Reusable series-extraction/statistics helper for chart-output assertions in tests (see "Core-vs-pipeline parity testing" below)                                                                                    |
| `src/pipeline/totalChartParity.test.ts`        | Example consumer of the parity-test harness pattern below                                                                                                                                                          |

**Dev proxy:** `vite.config.ts` defines a `sheetsProxyPlugin` that forwards `/sheets-proxy/*` to `https://docs.google.com/*` using Node's `fetch`, which follows redirects server-side and avoids CORS issues. In production `useConjugateData` hits Google directly — this only works with published sheets.

## Core-vs-pipeline parity testing

As charts migrate from `@dyel/core` to `@dyel/pipeline` (see the pipeline migration boundary rule: migrated components call only `runPipeline`, never `@dyel/core`), use this harness pattern to regression-test the new pipeline output rather than trusting it blind. See `src/testUtils/CLAUDE.md` for full detail; summary:

1. Capture a real (not synthetic) CSV fixture from a published sheet into `packages/app/test/fixtures/`, via the dev server's `/sheets-proxy` (documented per-fixture in `packages/app/test/fixtures/CLAUDE.md`).
2. In a `*.test.ts` colocated with the migrated feature (e.g. `src/pipeline/totalChartParity.test.ts`), load the fixture once in `beforeAll`, run it through the real `runPipeline` + the production `DatasetSpec[]`, and merge to `ChartPoint[]` with the same `utils/pipelineChartUtils.ts` helpers the app uses.
3. Use `src/testUtils/compareChartSeries.ts` (`it.each` over series names) for hard assertions on any series that must match exactly; use a soft `console.warn`-only test for any series with a known, accepted divergence from the legacy implementation.
4. This is a regression harness, not a `@dyel/core` reimplementation check — it does not run the old code path side-by-side; it asserts the new pipeline's output is internally consistent and sane against real data.

Extend this pattern for future chart migrations instead of inventing new one-off comparison scripts.

### Intentional exception: core-vs-pipeline live diff in tests

`packages/app/src/pipeline/totalChartParity.test.ts` is a deliberate, scoped exception to the pipeline migration boundary rule (which mandates that migrated chart components call only `runPipeline`, never `@dyel/core`). This test file imports directly from both `@dyel/core` (`parseConjugateData`, `buildSessionStats`, `calculateVolumeCorrelation`, `buildChartData`) and `@dyel/pipeline` (`runPipeline`) to run the legacy implementation and pipeline implementation over the same fixture in parallel, then use `src/testUtils/diffChartSeries.ts` (`joinChartPointsByDate` + `diffSeries`) to diff the two outputs.

**Why this exception is safe:** It is confined to a test file (never shipped runtime code); the actual migrated `TotalChart`/`ConjugateCharts` components themselves continue to call only `runPipeline`, fully satisfying the real boundary. The test exists specifically to regression-test the migration itself — catching divergence between old and new implementations rather than reintroducing a legacy runtime dependency into production code.

**Handling known divergence:** Real differences between legacy and pipeline normalization-fitting are treated as soft-warn (logged via `console.warn`, not hard-fail) rather than hard assertions. See the comment block directly above the `core-vs-pipeline soft-warn: %s divergence...` test in `totalChartParity.test.ts` for the full root-cause explanation (speed-work filtering, minimum-sample gating, canonical grouping granularity), and GitHub issue #451 for a specific tracked contributing bug (chain-count/band-tension canonical collapsing).

**Forward rule:** Any new direct `@dyel/core` import inside a migrated chart's actual runtime component (not a test file) remains a boundary violation and should be treated as a proposed pipeline change per the existing convention — this exception is test-file-only.

## Constraints

**Published sheets only.** Only support features that work with published Google Sheets (`/pub?output=csv`). Do not add features that require the `/export?format=csv` endpoint — it only works for sheets that are publicly accessible without publishing, which is a rare configuration.

## Vitest / Vite config split (required)

Keep Vitest config in a **separate `vitest.config.ts`** — never embed a `test:` block in `vite.config.ts`.

**Why:** Vitest 3 bundles its own Vite 7, whose types conflict with this project's Vite 8. `tsconfig.node.json` only includes `vite.config.ts`, so a standalone `vitest.config.ts` is never processed by `tsc -b` and the type mismatch is avoided. Tracked in issues #15 (bug) and #16 (fix).

**Rules:**

- `vite.config.ts` must have no `test:` block and no `/// <reference types="vitest" />`
- `vitest.config.ts` must import `defineConfig` from `vitest/config` and own all `test` config
- Verify this before pushing any new CI workflow — violating it causes `tsc -b` to fail with `'test' does not exist in type 'UserConfigExport'`
