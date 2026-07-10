# Deprecating @dyel/core

## Goal

Fully remove `@dyel/core` from the workspace (delete `packages/core/`, drop it from
root `package.json` workspaces and all consumer `package.json` dependency lists) now
that `@dyel/pipeline`/`@dyel/api` cover its functionality. The core-vs-pipeline parity
test suite (`packages/app/src/pipeline/*Parity.test.ts` + `packages/app/src/testUtils/`)
was always documented as temporary migration scaffolding, meant to be deleted once the
migration finished — see `packages/app/CLAUDE.md`'s (now-removed) "Core-vs-pipeline
parity testing" section.

## Done

1. **`ConjugateCharts`/`VariationRadarChart` swap-overs** (#459/#460, predate this doc) —
   both fully on `@dyel/pipeline` now, see `migration/ConjugateCharts.md` and
   `migration/VariationRadarChart.md` for the full normalization-divergence
   root-causing history.
2. **ValidatorPage migrated off `@dyel/core`** — see `migration/ValidatorPage.md`.
   New `packages/app/src/utils/validators/{pipelineSheetValidator,pipelineFreeformValidator}.ts`
   validate against `@dyel/pipeline`'s expected input shape. Exercise-name
   classification uses a new, additive `@dyel/pipeline` export,
   `classifyExerciseName` (`packages/pipeline/src/tag/tag.ts`), added specifically so
   the validators wouldn't need `@dyel/core`'s `nameToExercise`.
3. **`useIndexData`'s `parseIndexCsv` replaced** with an app-local parser
   (`packages/app/src/utils/parseIndexCsv.ts`) — the index sheet is a flat link list,
   not chart/session data, so it doesn't need to live in `@dyel/pipeline`.
4. **`DeadliftStancePreference` relocated** from `@dyel/core` into
   `packages/app/src/utils/appUtils.ts` — it's a UI preference type with no pipeline
   computation dependency.
5. **Parity test suite deleted**: all 9 `*Parity.test.ts` files and the 3 shared
   `testUtils` diff helpers (`compareChartSeries`, `diffChartSeries`,
   `diffVariationSnapshot`), plus the doc sections describing them.
   `packages/app/src/pipeline/conjugateChartSpecs.ts` and
   `packages/api/src/totalChartSpecs.ts` were deliberately NOT touched — both are
   genuinely used in production, not just by the deleted parity tests.

Commits: "Migrate ValidatorPage, useIndexData, and DeadliftStancePreference off
@dyel/core" and "Delete core-vs-pipeline parity test suite now that app-side
@dyel/core gaps are closed" on `migration-phase-1`.

## Remaining, in dependency order

### 1. Delete the dead-code cluster in `packages/app`

These files still import `@dyel/core` but have **zero production callers** — confirmed
by grepping for actual call sites, not just imports. `App.tsx` gets equivalent
behavior today from `@dyel/api`'s `groupByLiftType`/`defaultCompExerciseCanonical`
instead (see `packages/api/src/sheet/{parseSheetData,defaultExercise}.ts`). Only the
now-deleted parity tests were still referencing these:

- `packages/app/src/hooks/conjugate/useConjugateData.ts` (+ its `index.ts`/dir if
  nothing else lives there)
- `packages/app/src/hooks/data/useBaselineTargetExercises.ts`
- `packages/app/src/hooks/data/useLastSessionStats.ts`
- `packages/app/src/utils/appDataUtils.ts` (+ its `.test.ts`)
- The `distinctDisplayNames`/`ConjugateDataPair` import in
  `packages/app/src/utils/appUtils.ts` (only `distinctDisplayNames` itself needs
  removing; `LiftType` there should switch to `@dyel/pipeline`'s own `LiftType` — it's
  already duplicated verbatim in `packages/pipeline/src/tag/detect/conjugate-types.ts`)

Verify with `npm run build -w packages/app && npm test -w packages/app` after deleting.

### 2. Update stale docs describing the old core-backed data flow

`packages/app/CLAUDE.md`'s "Data flow" section still describes the obsolete
`useConjugateData()`/`parseConjugateData` flow as current — it's actually
`useResolvedRawInput` → `runPipelineModel` now (see `packages/app/src/utils/rawInputUtils.ts`,
`packages/app/src/context/PipelineContext.tsx`). Check `hooks/conjugate/CLAUDE.md`,
`hooks/data/CLAUDE.md`, and `components/conjugate/CLAUDE.md` for the same staleness,
and update/remove them to match whatever remains after step 1's deletions.

### 3. Migrate `@dyel/api`'s remaining `@dyel/core` dependencies

**Discovered mid-effort, not originally scoped.** `packages/api`'s `package.json` only
declares `@dyel/pipeline` as a dependency, and its own `CLAUDE.md` says it's "the sole
boundary between `packages/app` and `@dyel/pipeline`" — but several of its modules
still import `@dyel/core` directly (an undeclared dependency that only resolves
because npm workspaces hoist `node_modules`):

- `packages/api/src/text/parseTextData.ts`
- `packages/api/src/filters/exerciseFilters.ts`
- `packages/api/src/volume/volume.ts`
- `packages/api/src/chart/buildChartData.ts`

Confirmed live production impact: `App.tsx` calls `parseTextData`, `filterByDateRange`,
and `calculateVolumeCorrelation`/`calculateVolumeCorrelationFromTagged` from
`@dyel/api` directly — all three route through the core-dependent files above, so
they need real `@dyel/pipeline`-native replacements, not deletion.
`buildChartData` looks like a dead export now that its only consumer
(`totalChartParity.test.ts`) has been deleted — **confirm this via grep before
assuming**, and if genuinely unused, delete it rather than migrate it.

Migrate package-by-package, verifying with `npm test -w packages/api && npm run
build -w packages/api` after each, plus the full `packages/app` suite since `App.tsx`
is a live consumer.

### 4. Final removal

Once `grep -rn "@dyel/core" -- ':!packages/core'` (repo root) comes back empty:

- Delete `packages/core/` entirely.
- Drop it from the root `package.json` workspaces array (currently `packages/*`, so
  no entry to remove there beyond the directory itself) and the `@dyel/core`
  dependency entries in `packages/app/package.json` / `packages/api/package.json`.
- Remove the "Shared Core Package" mapping and "Build Shared Core" command from root
  `CLAUDE.md`.
- Final verification: `npm install && npm run build -w packages/pipeline && npm run
build -w packages/api && npm run build -w packages/app && npm test -w
packages/pipeline && npm test -w packages/api && npm test -w packages/app` — all
  green, and the pre-commit hook (which already runs the full workspace build+test)
  will re-confirm this on the deletion commit.

## Deferred — explicitly next, but NOT part of this effort

`@dyel/api`'s own `CLAUDE.md` states it's "the sole boundary between `packages/app`
and `@dyel/pipeline` — app components/hooks must never import `@dyel/pipeline`
directly." In practice, ~20 files in `packages/app` import `@dyel/pipeline` directly
today (`App.tsx`, several `components/charts/*.tsx`, `hooks/pipeline/*.ts`,
`utils/rawInputUtils.ts`, the new validators added in this effort, etc.), directly
contradicting that rule — and also contradicting `packages/app/CLAUDE.md`'s own MVC
section, which documents `hooks/pipeline/*` as a legitimate direct-`@dyel/pipeline`-
consuming "Controller" layer. The two docs currently disagree with each other and with
reality.

This is a separate, explicitly deferred effort: **do not start it until
`packages/core` is fully deleted per step 4 above.** When picked up, it needs its own
scoping pass to reconcile the two conflicting docs (either move everything behind
`@dyel/api`, or walk back `@dyel/api/CLAUDE.md`'s "sole boundary" claim to match the
documented Controller-layer convention) before touching any files.
