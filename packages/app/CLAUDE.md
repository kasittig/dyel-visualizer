# CLAUDE.md

## Commands

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # tsc -b && vite build
npm test          # vitest run --passWithNoTests
```

Set `VITE_SHEET_URL` in `.env.local` to pre-fill the sheet URL input during development (see `.env.example`).

## Architecture

Single-page React app with no backend. Data comes from either a user-supplied Google Sheet URL or pasted free-text (both are input modes on `SheetUrlPanel`). There is no router — page selection is done via `?page=` query params (or matching path segment) via `resolvePage()`/`siteRootPath()` in `shared/pageRouting.ts`, consumed by `main.tsx`.

**Page routing (`shared/pageRouting.ts`, consumed by `main.tsx`):**

- `?page=conjugate` (or `/conjugate`) → `ConjugateInfoPage` (renders `CONJUGATE.md` as markdown)
- `?page=index` (or `/index`) → `IndexPage` (list of linked sheets fetched from a hardcoded published index sheet)
- `?page=validator` (or `/validator`) → `ValidatorPage` (sheet/pasted-text structural validation)
- `?page=pipeline-validation` (or `/pipeline-validation`) → `PipelineValidationPage` (parse errors, unknown exercises, normalization issues via `runPipeline`)
- `?page=team` (or `/team`) → `TeamViewPage` (multi-lifter e1RM/target-weight table; `?page=coach` (or `/coach`) supported as a backward-compatible alias; fans out over every lifter's `PipelineModel` from the index sheet instead of `PipelineContext`'s single model — see `features/team-view/CLAUDE.md`)
- `?page=team-summary` (or `/team/summary`) → `TeamSummaryPage` (always-visible per-lifter summary/leaderboard table — Squat/Bench/Deadlift/Total/Sessions/Last set/Date — reusing `useTeamViewData` from `features/team-view/`; an internal-preview alternative to `TeamViewPage`, linked from it via a 🏆 "Summary view" link, kept at both URLs so users can compare and give feedback before one replaces the other — see `features/team-summary/CLAUDE.md`; note `resolvePage()` special-cases the `/team/summary` two-segment path since bare last-path-segment matching would otherwise collide with other `/*/summary` paths)
- no `?page=` → `App` (main visualizer)

**GitHub Pages deep links need an absolute asset base, not just JS routing:** `resolvePage()`
correctly identifies deep links like `/team/summary` client-side, but GitHub Pages itself has no
server-side rewrites — unknown paths are served via `ci.yml`'s `dist/index.html` -> `dist/404.html`
copy, and that HTML's own asset URLs must resolve correctly before `resolvePage()` ever runs.
`vite.config.ts`'s `base` therefore uses `process.env.VITE_BASE_PATH ?? '/'` — root `/` locally,
but `/dyel-visualizer/` (absolute) when set by the CI build — instead of a relative base, because a
relative base (`./assets/...`) resolves against the current URL's path depth and 404s for any path
more than one segment below the real site root (this broke `/team/summary` specifically). See the
comment in `vite.config.ts` for the full explanation.

**Navigating back to the site root:** `shared/pageRouting.ts` also exports `siteRootPath()`, the inverse of `resolvePage()` — it strips whatever known page path was matched off `window.location.pathname` (same two-segment-before-single-segment precedence as `resolvePage()`) and returns the app's true root path (e.g. `/` locally, `/dyel-visualizer/` on GitHub Pages), always trailing-slash-terminated. `TeamViewPage.tsx`/`TeamSummaryPage.tsx` use it to build their "← Back to DYEL Visualizer" / "🏆 Summary view" / per-lifter sheet deep-link `href`s instead of dot-relative paths (`href="."`) — a dot-relative href resolves based on the _current_ path's depth and trailing slash, which breaks for the two-segment `/team/summary` path (it resolves one level too shallow, landing back on `/team` and creating a navigation loop rather than reaching the root).

**Data flow (`app/App.tsx` composing `app/*` hooks):**

1. `useAppSettings()` owns all settings state (`url`, `inputMode`, `pastedText`, `activeTab`, date range, transient UI state), the query-param → localStorage reconciliation, the URL-sync effect, and the `athlete` memo.
2. `usePipelineOrchestration(inputMode, url, pastedText, refreshToken, athlete)` resolves a `RawInput[]` via `useResolvedRawInput` (`features/data-source/`) (URL mode calls `fetchSheetCsv` to retrieve the published CSV, using the dev proxy `/sheets-proxy/` during development to handle CORS; text mode directly wraps the pasted text into a `RawInput`), then passes it to `buildPipelineModel(raw, athlete)` from `@dyel/api` (a thin wrapper over `@dyel/pipeline`'s `runPipelineModel`, which performs all parsing, normalization, tagging, and diagnostic computation in a single call), returning a `PipelineModel`. It also owns the raw-data cache (keyed by sheet URL, persisted to `localStorage`) so a revisit renders the last sheet's data instantly instead of a blank/loading state — explicit `?sheet=`/`?mode=`/`?text=` query params always override cached settings.
3. `useVisualizerData(model, dateRange)` derives `tabRows`, visible-lift-type filtering, default canonicals, display unit, and volume/session-date data via `@dyel/api` selectors.
4. The `PipelineModel` is stored in context via `PipelineProvider` and accessed downstream via the `usePipelineModel()` hook (both in `app/PipelineContext.tsx`). Child components use selector hooks from their owning feature directory (e.g., `features/lift/usePipelineConjugateChartData`, `features/sigma/usePipelineTotalChartData`) to derive display-ready data from the model.
5. Exercise-type tabs (squat / bench / deadlift / accessory) render `features/lift/LiftTabPanel` (which composes `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel`, all colocated in `features/lift/`) consuming the derived data from selectors.
6. `shared/components/ErrorBoundary` wraps the root in `main.tsx`.

**Tab state:** `app/App.tsx` owns a single `activeTab: PageTab` state variable that tracks the current tab. Valid values are lift types (`'squat'`, `'bench'`, `'deadlift'`, `'accessory'`) or non-lift tabs (`'sigma'` for the competition-total overview, `'calculator'` for the rep/strength-score calculators). The active tab is persisted to localStorage and restored on revisit.

**Directory layout** (`src/`, per-feature, flat — no `components/`/`hooks/` subdirs within a feature):

| Directory                  | Contents                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                     | `App.tsx`, `PipelineContext.tsx` (`PipelineProvider`/`usePipelineModel`), `useAppSettings`, `usePipelineOrchestration`, `useVisualizerData`, `appTabs.ts` (`PageTab`/`InputMode` types + `MAIN_TABS`)                                           |
| `features/data-source/`    | `SheetUrlPanel`, `InputModeToggle`, `GettingStarted`, `useResolvedRawInput`, `rawInput.ts`, `sheetRef.ts`, `sheetFetch.ts`, `sheetCacheUtils.ts`                                                                                                |
| `features/validation/`     | `ValidatorPage`, `PipelineValidationPage`, `useSheetValidation`, `useTextValidation`, `usePipelineValidation`                                                                                                                                   |
| `features/calculator/`     | `RepCalculator`, `usePipelineRepCalculator`, `StrengthScoreCalculator`, `useStrengthScores`                                                                                                                                                     |
| `features/sigma/`          | `SigmaTab`, `SigmaChart`, `TotalChart`, `SessionBarChart`, `usePipelineTotalChartData`, `usePipelineDatasets`, `useSigmaChartData`                                                                                                              |
| `features/lift/`           | `LiftTabPanel`, `ConjugateCharts`, `usePipelineConjugateChartData`, `VariationRadarChart`, `usePipelineVariationRadarData`, `DiagnosticsPanel`, `usePipelineDiagnostics`                                                                        |
| `features/conjugate-info/` | `ConjugateInfoPage`                                                                                                                                                                                                                             |
| `features/team-view/`      | `TeamViewPage`, `useTeamViewData`, `useTeamViewSelection` — no `PipelineContext`; fans out over every lifter's `PipelineModel` from the index sheet                                                                                             |
| `features/team-summary/`   | `TeamSummaryPage`, `useTeamSummaryData` — internal-preview leaderboard variant of `features/team-view/`; reuses `useTeamViewData` from `features/team-view/` via its barrel; no `PipelineContext`                                               |
| `features/index-page/`     | `IndexPage`, `useIndexData`, `parseIndexCsv`                                                                                                                                                                                                    |
| `shared/charts/`           | Reusable Recharts components: `BaseRadarChart`, `DateLineChart` (+`ChartEmpty`), `TooltipCard` (+`ChartTooltip`), `colors.ts`, `CONVENTIONS.md`, `charts.module.css` (shared CSS module `composes`d by feature-owned chart `.module.css` files) |
| `shared/components/`       | Cross-feature UI: `CollapsibleSection`, `DateRangePicker`, `EditableDateChip`, `ErrorBoundary`, `TypeaheadDropdown`, `Table` (+ `TableCard`/`TableHeadRow`/`TableRow`/`TableCell` — shared sortable-table primitives)                           |
| `shared/hooks/`            | `useCsvResource`, `useLocalStorageState`, `useSortableRows`                                                                                                                                                                                     |
| `shared/dateUtils.ts`      | Pure date-formatting helpers — no React dependency                                                                                                                                                                                              |
| `shared/liftTypeLabels.ts` | Lift type labels and canonical ordering (`LIFT_TYPE_LABELS`, `LIFT_TYPE_ORDER`) — no React dependency                                                                                                                                           |
| `shared/pageRouting.ts`    | `resolvePage()`/`siteRootPath()`/`KNOWN_PAGES` — no-router page selection and its inverse (site-root path for in-app navigation links), consumed by `main.tsx` and `TeamViewPage`/`TeamSummaryPage` — no React dependency                       |

Each `features/*/` and `shared/*/` directory has an `index.ts` barrel and a `CLAUDE.md` with per-file descriptions.

**Dev proxy:** `vite.config.ts` defines a `sheetsProxyPlugin` that forwards `/sheets-proxy/*` to `https://docs.google.com/*` using Node's `fetch`, which follows redirects server-side and avoids CORS issues. In production `fetchSheetCsv` hits Google directly — this only works with published sheets.

## Data flow contract

The app enforces a unidirectional data flow: **data source → `usePipelineOrchestration` (calls `@dyel/api`'s `buildPipelineModel`) → `PipelineModel` held in `PipelineContext` → feature selector hooks (call `@dyel/api` derivation functions) → render-only components → user events → state updates in `app/useAppSettings` or feature-local state → re-render**.

This separation ensures business logic stays in `@dyel/api`, React lifecycle stays in feature hooks, and components remain pure rendering functions. ESLint rules in `eslint.config.js` enforce this contract via static analysis.

**Known data-flow modeling issue (documented, not yet refactored):** `useVisualizerData` returns both `baselineCanonicals` and `targetCanonicals` assigned from a single `defaultCanonicalsByLift(...)` memo, falsely implying two independent computations exist (CODE_REVIEW.md's "Lower-priority notes" section flagged this as a real issue, but it was deliberately left out of scope for remediation; see HANDOFF.md's "Remaining, not yet started" section). This is a documentation-only notice to prevent future misreading of the shape as two separate derivations.

### Component rules (`.tsx` files in `features/*/` and `shared/*/`)

- Render props and hook results only
- Never call `useMemo` or `useState` to re-derive business data — do that in a feature hook instead
- Never import **value** exports from `@dyel/api` (type imports are fine); get derived data by calling a feature hook instead
- Never call `usePipelineModel()` directly — only feature hooks do that
- Feature-local UI state (a popover's open/closed toggle, in-progress calculator inputs, which variation is highlighted) stays colocated in the owning component or feature hook

A small set of display-only helpers and constants are allowlisted to import from `@dyel/api` — these are pure formatters/constants with no business logic (e.g., `shared/charts/**` for chart formatting, `features/lift/DiagnosticsPanel.tsx` for display formatters like `formatEffect`, `features/calculator/RepCalculator.tsx` for facet option constants). See the `@typescript-eslint/no-restricted-imports` block and its per-file overrides in root `eslint.config.js` for the current allowlist; that file is the source of truth, not this line count (which will drift).

### Feature hook rules (`use*.ts` in `features/*/`)

- The only consumers of `usePipelineModel()` and `PipelineContext`
- Call `@dyel/api` derivation functions (selectors, utilities) to compute all business logic from the model
- Own React lifecycle (`useState`, `useEffect`, `useMemo`) and return display-ready data for components to render
- Thin adapters between the shared model and components; delegate all derivation to `@dyel/api`

### State layering

- **App-wide state** (`app/useAppSettings`): settings, date range, active tab; persisted to localStorage and restored on revisit
- **Feature-local state**: a popover's open/closed flag, in-progress form inputs, transient selections — stays in the owning component or feature hook; never moved to app-wide state

### Cross-feature imports

- Features may import sibling features only via their `index.ts` barrel (e.g., `import { usePipelineDatasets } from '../sigma'`)
- Never deep imports like `../sigma/usePipelineDatasets`
- ESLint blocks deep imports to enforce explicit barrel exports and prevent accidental static inclusion of lazy-loaded page components

ESLint's `no-restricted-imports` patterns now enforce both the `../<name>/*` and `../../features/<name>/*` path forms — previously only the former was caught (CODE_REVIEW.md Finding 8 / HANDOFF.md Task B4). Five evasions using the `../../features/` form were repaired and the pattern widened in `eslint.config.js` to prevent future blind spots.

**Exception:** `features/data-source/SheetUrlPanel.tsx` keeps a deep import of `../index-page/useIndexData` because barrel-importing `../index-page` would statically pull the lazy-loaded `IndexPage` component into the main bundle and defeat `main.tsx`'s code-splitting. See the comment in that file and its matching per-file allowlist override in root `eslint.config.js`.

### Process for adding a new derivation

1. Add the function to `@dyel/api` with colocated tests
2. Export it from `packages/api/src/index.ts` (the public barrel)
3. Add a row to `packages/api/CLAUDE.md`'s export table describing it
4. Write a thin feature hook in `packages/app/src/features/*/use*.ts` that calls it
5. Components call that hook; never call `@dyel/api` directly

### Directory summary

- `app/`: `App.tsx`, settings/orchestration/visualizer-data hooks, `PipelineContext.tsx` with `PipelineProvider`/`usePipelineModel()`
- `features/*/`: feature hooks and components; each has an `index.ts` barrel and `CLAUDE.md`
- `shared/charts/`: reusable Recharts components and chart color constants
- `shared/components/`: cross-feature UI primitives (DateRangePicker, ErrorBoundary, TypeaheadDropdown, Table, etc.)
- `shared/hooks/`: cross-feature React hooks (useCsvResource, useLocalStorageState, useSortableRows)
- `shared/dateUtils.ts`: pure date-formatting helpers

See the **Directory layout** table above for complete per-directory file listings.

**Boundary:** `@dyel/api` is the sole business-logic boundary — the app never imports `@dyel/pipeline` directly (only `features/lift/usePipelineVariationRadarData.test.ts` does for real-fixture test coverage, allowlisted in `eslint.config.js`). This directory layout resulted from Phase 4 of the App Refactor migration (see `HANDOFF.md`), which reorganized `src/components/`, `src/hooks/`, `src/context/`, `src/utils/` into feature-based directories. Earlier, Phase 2 deleted `src/pipeline/` (non-hook derivation helpers) and moved that logic into `@dyel/api`.

## Decimal formatting

There is no shared number-formatting utility (no `Intl.NumberFormat` wrapper, no `formatNumber`/`formatDecimal` helper). The convention is inline `.toFixed(n)` at the render site, with a `??`/ternary fallback to a placeholder (`'—'` or `'-'`) when the value may be null/undefined:

```typescript
{score !== null ? score.toFixed(2) : '—'}
{r.averageIndex?.toFixed(1) ?? '-'}%
```

Current examples: `features/calculator/usePipelineRepCalculator.ts` (1dp reps), `features/calculator/StrengthScoreCalculator.tsx` (2dp score), `features/lift/DiagnosticsPanel.tsx` (1dp index), `features/lift/VariationRadarChart.tsx` (2dp e1RM).

Follow this pattern for new decimal displays rather than introducing a shared formatter — per this repo's "inline micro-expressions" style guideline, single-line calcs shouldn't be extracted into top-level utilities. Only extract to `shared/` if the exact same formatting logic (precision + fallback) is duplicated in 3+ places.

## Constraints

**Published sheets only.** Only support features that work with published Google Sheets (`/pub?output=csv`). Do not add features that require the `/export?format=csv` endpoint — it only works for sheets that are publicly accessible without publishing, which is a rare configuration.

## Vitest / Vite config split (required)

Keep Vitest config in a **separate `vitest.config.ts`** — never embed a `test:` block in `vite.config.ts`.

**Why:** Vitest 3 bundles its own Vite 7, whose types conflict with this project's Vite 8. `tsconfig.node.json` only includes `vite.config.ts`, so a standalone `vitest.config.ts` is never processed by `tsc -b` and the type mismatch is avoided. Tracked in issues #15 (bug) and #16 (fix).

**Rules:**

- `vite.config.ts` must have no `test:` block and no `/// <reference types="vitest" />`
- `vitest.config.ts` must import `defineConfig` from `vitest/config` and own all `test` config
- Verify this before pushing any new CI workflow — violating it causes `tsc -b` to fail with `'test' does not exist in type 'UserConfigExport'`
