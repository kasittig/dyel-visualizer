# CLAUDE.md

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # tsc -b && vite build
npm test          # vitest run --passWithNoTests
```

Set `VITE_SHEET_URL` in `.env.local` to pre-fill the sheet URL input during development (see `.env.example`).

## Architecture

Single-page React app with no backend. All data comes from a user-supplied Google Sheet URL. There is no router — page selection is done via `?page=` query params (or matching path segment) in `main.tsx`.

**Page routing (`main.tsx`):**

- `?page=conjugate` (or `/conjugate`) → `ConjugateInfoPage` (renders `CONJUGATE.md` as markdown)
- `?page=index` (or `/index`) → `IndexPage` (list of linked sheets fetched from a hardcoded published index sheet)
- `?page=text` (or `/text`) → `TextInputPage` (paste-text input; extracts raw lines via `extractTextLines` from `@dyel/core`)
- no `?page=` → `App` (main visualizer)

**Data flow (`App.tsx`):**

1. Takes a URL, calls `extractSheetRef()` to parse it into `{ id, published }`, passes to `useConjugateData()`
2. `useConjugateData` fetches the sheet as CSV and calls `parseConjugateData` from `@dyel/core`
3. The resulting `ConjugateDataPair[]` flows through exercise-type tabs (squat / bench / deadlift / accessory), `ExerciseFilters`, and `LiftTabPanel` (which composes `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel`)
4. `useLastSessionStats` computes per-exercise stats from the pair list — e1RM, last session, predicted e1RM, variant factors, resistance offsets
5. `ErrorBoundary` wraps the root in `main.tsx`

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
| `infra/`     | `useCsvResource`, `useSheetValidation`                              |

Each subdirectory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Key modules:**

| Path                                           | Purpose                                                                                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/appUtils.ts`                        | Pure helpers (`extractSheetRef`, `toggleInSet`, `initialTabState`), type aliases (`LiftType`, `PageTab`, `TabState`), and URL/tab constants — no React dependency |
| `src/components/charts/BaseRadarChart.tsx`     | Shared Recharts radar wrapper; accepts `angleKey`, `unit`, `tooltip`, optional `onClick`                                                                          |
| `src/components/pages/SigmaTab.tsx`            | "Σ" overview tab: `TotalChart` + `SessionBarChart` + `SigmaRadarChart` across all lift types                                                                      |
| `src/components/pages/LiftTabPanel.tsx`        | Per-lift tab content: `ConjugateCharts` + `VariationRadarChart` with shared variation-highlight state                                                             |
| `src/components/shared/RepCalculator.tsx`      | Calculator tab: predicts weight-for-reps and reps-for-weight using `findBestE1RM` from `@dyel/core`                                                               |
| `src/components/shared/DiagnosticsPanel.tsx`   | Diagnostics panel using `generateDiagnostics` from `@dyel/core`                                                                                                   |
| `src/components/shared/DateRangePicker.tsx`    | Date range input using `react-day-picker` + Radix Popover                                                                                                         |
| `src/components/pages/IndexPage.tsx`           | Landing page listing linked sheets; fetches from a hardcoded published index sheet via `useIndexData`                                                             |
| `src/hooks/data/useBaselineTargetExercises.ts` | Builds `baselineExByType` and `targetExByType` maps; shared by `TotalChart` and `SigmaRadarChart`                                                                 |
| `src/hooks/conjugate/useConjugateChartData.ts` | All data aggregation for `ConjugateCharts` (grouping, normalization, forward-fill); the component itself is presentation-only                                     |
| `src/hooks/data/useIndexData.ts`               | Fetches and parses the published index sheet CSV; returns `IndexEntry[]`                                                                                          |

**Dev proxy:** `vite.config.ts` defines a `sheetsProxyPlugin` that forwards `/sheets-proxy/*` to `https://docs.google.com/*` using Node's `fetch`, which follows redirects server-side and avoids CORS issues. In production `useConjugateData` hits Google directly — this only works with published sheets.

## Constraints

**Published sheets only.** Only support features that work with published Google Sheets (`/pub?output=csv`). Do not add features that require the `/export?format=csv` endpoint — it only works for sheets that are publicly accessible without publishing, which is a rare configuration.

## Vitest / Vite config split (required)

Keep Vitest config in a **separate `vitest.config.ts`** — never embed a `test:` block in `vite.config.ts`.

**Why:** Vitest 3 bundles its own Vite 7, whose types conflict with this project's Vite 8. `tsconfig.node.json` only includes `vite.config.ts`, so a standalone `vitest.config.ts` is never processed by `tsc -b` and the type mismatch is avoided. Tracked in issues #15 (bug) and #16 (fix).

**Rules:**

- `vite.config.ts` must have no `test:` block and no `/// <reference types="vitest" />`
- `vitest.config.ts` must import `defineConfig` from `vitest/config` and own all `test` config
- Verify this before pushing any new CI workflow — violating it causes `tsc -b` to fail with `'test' does not exist in type 'UserConfigExport'`
