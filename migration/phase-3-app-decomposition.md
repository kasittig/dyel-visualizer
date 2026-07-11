# Phase 3 — App.tsx decomposition + @dyel/pipeline allowlist removal

Objective: App.tsx (441 lines) shrinks to ~150 lines of state + JSX; pipeline orchestration, settings plumbing, and model-derived data each live in a dedicated hook; zero production files in `packages/app` import `@dyel/pipeline`.

Prerequisite: Phases 1–2 merged. Tasks 3.1–3.3 create hooks and can run in parallel (each copies logic OUT of App.tsx but does not edit it); Task 3.4 rewires App.tsx and must run after all three; 3.5–3.7 follow 3.4.

New hooks land in `packages/app/src/hooks/app/` (Phase 4 moves them to `src/app/`).

---

## Task 3.1 — Create `useAppSettings.ts`

- Read: `packages/app/src/App.tsx` (~lines 32–105 and the `handle*Change` handlers ~328–343), `packages/app/src/hooks/infra/useLocalStorageState.ts`.
- Create `packages/app/src/hooks/app/useAppSettings.ts` containing, relocated verbatim where possible:
  - the mount-time query-param → localStorage reconciliation (`?sheet`/`?mode`/`?text` overrides, useState initializer pattern)
  - all settings state: `url`, `inputMode`, `pastedText`, `activeTab`, `deadliftStance` (localStorage-backed) + `dateRange`, `panelForcedOpen`, `refreshToken`, `shownResetToken`
  - the URL-sync effect (`history.replaceState`)
  - the `athlete` memo (hardcoded `sex:'M', bodyweight:80`)
  - `handleUrlChange`/`handleTextChange`/`handleModeChange`
- Return one object `{ ...state, ...setters, handlers }` — keep names identical to App.tsx locals so Task 3.4 is mechanical.
- Do NOT edit App.tsx in this task.

## Task 3.2 — Create `usePipelineOrchestration.ts`

- Read: `packages/app/src/App.tsx` (~lines 107–190), `packages/app/src/utils/rawInputUtils.ts`, `packages/app/src/utils/sheetCacheUtils.ts`.
- Create `packages/app/src/hooks/app/usePipelineOrchestration.ts` with signature `(inputMode, url, pastedText, refreshToken, athlete)` containing App.tsx's:
  - `sheetRef`/`invalidUrl` via `extractSheetRef`
  - `useResolvedRawInput` call
  - model build — **replace both `runPipelineModel` call sites with `buildPipelineModel` from `@dyel/api`** (Task 1.7); remove the `@dyel/pipeline` import
  - raw-cache write effect + `cachedSheetData` localStorage state (moves here with its custom serialize from sheetCacheUtils)
  - `effectiveRaw`/`effectiveModel`/`effectiveStatus`
  - the `parseTextData` textValidation memo
- Return `{ status, model, invalidUrl, textValidation }` (+ anything else App's JSX consumes from this region — enumerate while reading).
- Do NOT edit App.tsx in this task.

## Task 3.3 — Create `useVisualizerData.ts`

- Read: `packages/app/src/App.tsx` (~lines 193–326).
- Create `packages/app/src/hooks/app/useVisualizerData.ts` with signature `(model, dateRange, deadliftStance)`; one memoized block calling `@dyel/api`:
  - `groupByLiftType` → `tabRows`
  - `defaultCanonicalsByLift(tabRows, deadliftStance)` — replaces BOTH duplicated baseline/target loops with one call used twice
  - `visibleLiftTypes(tabRows, dateRange?.from, dateRange?.to)` — replaces the hand-rolled inline date filtering
  - `detectDataUnit`, `collectVolumeRecords` + `calculateVolumeCorrelationFromTagged`, `collectSessionDates`
- Return `{ tabRows, visibleLiftIds, baselineCanonicals, targetCanonicals, dataUnit, volumeByDate, allSessionDates, lastSessionDate }`.
- The default-date-range effect does NOT move here (it sets App-owned state); note that App will compute it via `defaultDateRangeFromLastSession` in Task 3.4.
- Do NOT edit App.tsx in this task.

## Task 3.4 — Rewrite App.tsx (after 3.1–3.3)

- Read: `packages/app/src/App.tsx`, the three new hooks.
- Rewrite App.tsx to: call `useAppSettings()` → `usePipelineOrchestration(...)` → `useVisualizerData(...)`, keep the default-date-range effect (now via `defaultDateRangeFromLastSession` from `@dyel/api`), keep `effectiveActiveTab`/`liftTab` derivation if trivial (one-liners stay inline per code style), keep all JSX (SheetUrlPanel, PipelineProvider, tab nav, tab-body switch).
- Remove the `@dyel/pipeline` import entirely (both `runPipelineModel` and `AthleteContext` — the type is re-exported by `@dyel/api`).
- Done when: App.tsx ≈150 lines, no `@dyel/pipeline` import, behavior identical.

## Task 3.5 — usePipelineValidation → api wrapper

- Read: `packages/app/src/hooks/infra/usePipelineValidation.ts` + its test.
- Replace the `runPipeline` import from `@dyel/pipeline` with `validatePipelineRun` from `@dyel/api` (Task 1.7). Fetch/state machinery unchanged.

## Task 3.6 — Split mixed util files

- `packages/app/src/utils/rawInputUtils.ts`: split into `rawInput.ts` (pure `buildRawInput` + `PLACEHOLDER_ATHLETE`, keeps the existing test) and `useResolvedRawInput.ts` (the React hook) in the same directory; repoint importers.
- `packages/app/src/utils/appUtils.ts`: split into `sheetRef.ts` (`extractSheetRef`, `SheetRef`, `EXAMPLE_*` URLs — pure, stays app-side) and `appTabs.ts` (`MAIN_TABS`, `PageTab`, `InputMode`, `DeadliftStancePreference` — UI constants/types); delete `LIFT_TABS` if now unused (check after 3.3/3.4); repoint importers.

## Task 3.7 — Shrink the ESLint allowlist

- Read: `eslint.config.js` (~lines 42–73).
- The `no-restricted-imports` OFF-override for `@dyel/pipeline` currently allowlists three files; shrink it to only `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.test.ts`.
- Update the doc comment on `packages/app/src/context/PipelineContext.tsx` to name `usePipelineOrchestration` (not App.tsx) as the model producer. PipelineProvider itself stays a dumb pass-through — do not move model computation into it.
- Done when: `grep -rn "@dyel/pipeline" packages/app/src --include='*.ts*'` shows only the one test file, and `npx eslint packages/app` is clean.

---

## Phase verification (team-lead)

1. Builds + tests green.
2. `grep -rn "from '@dyel/pipeline'" packages/app/src` → exactly one test file.
3. run-dyel-visualizer smoke with emphasis on state plumbing: `?sheet=` / `?mode=text&text=` query-param overrides, cached-sheet instant restore on reload, refresh button, URL/text mode switching, default 3-month date range appearing on first load, tab visibility respecting date range.
