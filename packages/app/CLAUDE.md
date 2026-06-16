# CLAUDE.md

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # tsc -b && vite build
npm test          # vitest run --passWithNoTests
```

Set `VITE_SHEET_URL` in `.env.local` to pre-fill the sheet URL input during development (see `.env.example`).

## Architecture

Single-page React app with no backend. All data comes from a user-supplied Google Sheet URL. There is no router — page selection is done via `?page=` query params in `main.tsx`.

**Page routing (`main.tsx`):** `?page=conjugate` renders `ConjugateInfoPage` (which displays `CONJUGATE.md` as markdown via react-markdown); anything else renders `App`.

**Data flow:**

1. `App.tsx` takes a URL, calls `extractSheetRef()` (from `src/utils/appUtils.ts`) to parse it into `{ id, published }`, and passes it to `useConjugateData()`
2. `useConjugateData` (in `src/hooks/useConjugateData.ts`) fetches the sheet as CSV and calls `parseConjugateData` from `@dyel/core`
3. The resulting `ConjugateDataPair[]` (tuples of `[ConjugateExercise, TrainingSession]`) flows through exercise-type tabs (squat / bench / deadlift / accessory), `ExerciseFilters`, `ConjugateCharts`, and `ExerciseList`
4. `useLastSessionStats` (in `src/hooks/useLastSessionStats.ts`) computes per-exercise stats from the pair list — e1RM, last session, predicted e1RM, variant factors, resistance offsets
5. `ErrorBoundary` wraps `<App />` in `main.tsx`

**Tab state:** `App.tsx` owns a single `tabState: Record<LiftTab, TabState>` (type defined in `appUtils.ts`) instead of separate `filterState`/`baselineNames`/`targetNames` objects. All three concerns are updated together, which prevents them from diverging.

**Key modules:**

| Path | Purpose |
|---|---|
| `src/utils/appUtils.ts` | Pure helpers (`extractSheetRef`, `defaultBaselineName`, `defaultTargetName`, `toggleInSet`), type aliases (`LiftTab`, `PageTab`, `TabState`), and URL constants — no React dependency |
| `src/components/BaseRadarChart.tsx` | Shared Recharts wrapper used by `SigmaRadarChart` and `VariationRadarChart`; accepts `angleKey`, `unit`, `tooltip`, optional `onClick` |
| `src/hooks/useBaselineTargetExercises.ts` | Builds `baselineExByType` and `targetExByType` maps; shared by `TotalChart` and `SigmaRadarChart` |
| `src/hooks/useConjugateChartData.ts` | All data aggregation for `ConjugateCharts` (grouping, normalization, forward-fill); the component itself is presentation-only |
| `src/components/LiftTabPanel.tsx` | Per-lift tab content: `ConjugateCharts` + `VariationRadarChart` with shared variation-highlight state |
| `src/components/VolumeWorkToggle.tsx` | Checkbox toggle for excluding volume work (sets > 1) |

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
