# HANDOFF: Task 1 — rewire App.tsx off the legacy @dyel/core path

## Background

`App.tsx` currently runs TWO parallel data paths:

1. **Legacy** (`useConjugateData` → `@dyel/core`'s `parseConjugateData`, plus
   `appDataUtils.extractPairs`/`buildTabRows`/`computeEffectiveNames`, which uses
   `@dyel/core`'s `defaultCompExerciseName`). This is the actual source of truth for
   `tabRows`, tab visibility, sigma dates, volume correlation, and baseline/target
   names — i.e. real production state, not just a test fixture.
2. **Pipeline** (`PipelineProvider` → `runPipelineModel` via `useResolvedRawInput`),
   consumed only by already-migrated leaf components (`TotalChart`, `SigmaRadarChart`,
   `DiagnosticsPanel`, `RepCalculator`'s e1RM estimate, `StrengthScoreCalculator`).

Two concrete bugs from running both in parallel:

- The sheet CSV is fetched **twice** over the network (once in `useConjugateData` via
  `useCsvResource`, once in `useResolvedRawInput`).
- The `localStorage` instant-restore cache (`sheetCacheUtils.ts`) serializes the legacy
  `ConjugateDataPair[]` shape, not anything pipeline-derived.

**Blocking gap found:** `RepCalculator`'s bar/stance/equipment/addl-weight dropdowns read
structured fields off `@dyel/core`'s `ConjugateExercise` (`ex.bar`, `ex.stance`, ...) and
call `@dyel/core`'s `familyKey()`/`CONJUGATE_BARS`/etc. `@dyel/pipeline`'s
`TaggedSetRecord` only exposes this as opaque string tags (`bar:ssb`, `stance:sumo`,
`equip:board`, `addl:chains`) — there is no pipeline-native structured-facet API yet.
Per the pipeline migration boundary rule, this is "missing functionality" that must be
added to `@dyel/pipeline` (not proposed as a permanent `@dyel/core` dependency) before
`RepCalculator` can be fully cut over.

## Task Tracking

- [x] Task 1a: Add pipeline-native facet support: export `ConjugateBar`/`ConjugateStance`/
      `ConjugateEquipment`/`ConjugateAddlWt` types + `CONJUGATE_BARS`/`CONJUGATE_STANCES`/
      `CONJUGATE_EQUIPMENT`/`CONJUGATE_ADDL_WTS` constant arrays, `facetsFromTags` and
      `facetFamilyKey`, from `@dyel/pipeline`'s public `index.ts`.
      **Done.** 26 new tests in `packages/pipeline/src/tag/tag.test.ts`; 161/161 pipeline
      tests green, build clean.

- [x] Task 1b: Refactor `@dyel/api`'s `parseSheetData.ts` so `liftTypeOf`/`splitByEffort`
      operate on an already-computed `TaggedSetRecord[]` via newly-exported
      `groupByLiftType(tagged): Record<LiftType, SplitRows>`; `parseSheetData` now
      delegates to it.
      **Done.** 60/60 api tests green (10 in `parseSheetData.test.ts`), build clean.

- [x] Task 1c: Reworked `sheetCacheUtils.ts` to cache `{ sheetKey, raw: RawInput[] }`
      instead of parsed `ConjugateDataPair[]` — no more `Date` round-tripping.
      **Done.** 6/6 `sheetCacheUtils.test.ts` tests green.

- [x] Task 1d: Rewrote `App.tsx` to drop `useConjugateData`/`extractPairs`/`buildTabRows`/
      `computeEffectiveNames` as the source of truth. Added `defaultCompExerciseCanonical`
      (`@dyel/api`, ports `defaultCompExerciseName` onto `TaggedSetRecord[]` via
      `facetsFromTags`, returns a canonical id instead of a display name) and
      `calculateVolumeCorrelationFromTagged` (`@dyel/api`, kg→display-unit tonnage calc
      over `TaggedSetRecord[]`, sibling to the untouched legacy `calculateVolumeCorrelation`
      still used by the parity tests). Refactored `PipelineContext.tsx`'s `PipelineProvider`
      into a thin passthrough — `App.tsx` now calls `useResolvedRawInput` +
      `runPipelineModel` exactly once itself, fixing the double sheet-CSV-fetch bug, and
      passes `{ status, model }` down as props. `tabRows`/baseline/target names/tab
      visibility/sigma dates/volume correlation all now derive from
      `model.tagged`/`groupByLiftType`.
      **Done.** `npm run build -w packages/app` clean; 266/266 app tests green (at the
      time). Known interim gap left for Task 1e: `App.tsx` had to pass
      `tabRows={tabRows as any}` to `RepCalculator` since it still expected the old
      `ConjugateDataPair`-based shape — flagged and fixed in 1e, not left in place.

- [x] Task 1e: Rewrote `RepCalculator.tsx` onto `TaggedSetRecord`-based `tabRows`, using
      `facetsFromTags`/`facetFamilyKey`/`CONJUGATE_*` from `@dyel/pipeline` instead of
      `@dyel/core`. Exercise dropdown now dedupes by `canonical` (label = first-seen
      `meta.rawExercise`/`exercise`). Removed the `as any` cast at the `App.tsx` call site.
      Simplified `repCalculatorUtils.ts`'s `resolveE1RMEstimate` to take a `targetCanonical`
      directly and deleted `findCanonicalForExercise` (the old fuzzy display-name→canonical
      slug-matching) as dead code, since `RepCalculator` now always has an exact canonical
      in hand. Updated `repCalculatorParity.test.ts` accordingly.
      **Done.** `npm run build -w packages/app` clean (no `as any` anywhere); 264/264 app
      tests, 161/161 pipeline, 60/60 api all green.

- [x] Task 1f: Audited `ExerciseFilters.tsx`, `LiftTabPanel.tsx`, `SigmaTab.tsx`.
      **Result: no changes needed.** Neither `LiftTabPanel` nor `SigmaTab` ever actually
      received `tabRows`/`SplitRows` as a prop from `App.tsx` — both get their data
      independently via pipeline hooks. `LiftTabPanel`'s `targetName` prop (now a canonical
      id instead of a display name) is only used for lookup/keying
      (`VariationRadarChart`'s snapshot lookup + React `key`), never rendered to the user —
      confirmed no user-visible regression. `ExerciseFilters.tsx` turned out to not exist
      as a file at all (dead entry in `components/shared/CLAUDE.md` — not part of this
      task's scope to clean up, just noting it here).

- [x] Task 1g (QA): Full monorepo suite green — pipeline 161/161, api 60/60, app 264/264,
      `npm run build -w packages/app` clean. Dev server started at
      **http://localhost:5174** (5173 was in use) for manual smoke test — left running per
      convention. Manual checks still to be done by a human: confirm single sheet fetch in
      the Network tab (not double), localStorage restore-on-revisit still works, and
      RepCalculator's facet dropdowns populate/predict correctly.

## Non-goals (for this pass)

- Do not touch `ValidatorPage`/`useSheetValidation`/`useTextValidation`/`useIndexData` —
  tracked separately (Task 4/5 in the parent migration plan).
- Do not delete `packages/core` yet — other consumers still remain (tracked separately).
- Do not remove the `@dyel/core`-based parity-test exception files under
  `packages/app/src/pipeline/*Parity.test.ts` — that exception is intentional and
  documented in `packages/app/CLAUDE.md`.

---

# HANDOFF: Task 2 — fix identical 1-board/2-board bench e1RM prediction

## Background

User reported RepCalculator predicts the same e1RM for "1 board bench" and "2 board
bench" (2-board should predict higher — shorter ROM). Root-caused via Explore agent +
direct file reads. Full root-cause writeup and fix design:
`/Users/kasittig/.claude/plans/gleaming-wishing-marble.md`.

Two related bugs, same root cause (equipment magnitude — board/block/deficit count —
is parsed into `ParsedExercise.equipmentMagnitude` and correctly appended to canonical
strings, but never propagated into tags or into diagnostics' %-range lookup keys):

1. **RepCalculator prediction bug** (the reported symptom): `facetsFromTags` can't
   recover magnitude from tags (never encoded), so `RepCalculator.tsx`'s
   `effectiveCanonical` fallback-match ignores magnitude and collapses board counts.
2. **Diagnostics baseline-range bug** (same root cause, different symptom):
   `buildTagsAndEffects`'s `applyRange` lookup key also ignores magnitude, so
   `DiagnosticsPanel`'s "expected baseline %" is flat across board counts too.

## Task Tracking

- [x] Task 2a: Encode magnitude into pipeline tags + make diagnostics range/effects
      lookup magnitude-aware, with placeholder-but-flagged numeric ranges for 2/3-board
      etc. (Target: `packages/pipeline/src/tag/detect/canonical.ts`,
      `packages/pipeline/src/tag/detect/modifier-effects.json`; Test:
      `npm run build -w packages/pipeline`) — tracker task #1
      **Done.** Build clean. Caught + fixed a fallback bug mid-review: `add(magKey ?? baseKey)`
      didn't fall back to `baseKey` when `magKey` was truthy but had no `modifier-effects.json`
      entry (silently dropping effects for uncovered magnitudes) — corrected to
      `add(magKey && effectsMap[magKey] ? magKey : baseKey)`, matching `applyRange`'s existing
      pattern. One pre-existing test (`canonical.test.ts`, deficit-deadlift case) now fails by
      design since it hardcodes the old flat range for a magnitude (`2" deficit`) that now
      correctly resolves to its own new range — expected, deferred to Task 2e.
- [x] Task 2b: Expose `equipmentMagnitude` from `facetsFromTags`. (Target:
      `packages/pipeline/src/tag/tag.ts`; Test: `npm run build -w packages/pipeline`) —
      tracker task #2, blocked by 2a
      **Done.** Build clean; `facetFamilyKey` confirmed unaffected (reads magnitude from
      canonical strings, not tags). Implementer also updated `tag.test.ts` assertions for the
      new field + added targeted magnitude-parsing tests (within scope — existing test upkeep,
      not the dedicated Task 2e test work).
- [x] Task 2c: Fix `RepCalculator.tsx`'s `effectiveCanonical` matching + add a magnitude
      selector UI control. (Target: `packages/app/src/components/shared/RepCalculator.tsx`;
      Test: `npm test -w packages/app`) — tracker task #3, blocked by 2b
      **Done — this is the fix for the originally reported bug.** Added
      `selectedEquipmentMagnitude` state (populated from `facetsFromTags(...).equipmentMagnitude`
      alongside the existing bar/stance/equipment facets), a new "Magnitude" select control
      (shown only for board/blocks/deficit equipment, options derived dynamically from
      distinct magnitudes present in the loaded records — no hardcoded board-count list), and
      the critical fix: `effectiveCanonical`'s OR-fallback match condition now also requires
      `recFacets.equipmentMagnitude === selectedEquipmentMagnitude`, so 1-board and 2-board
      records can no longer collapse onto the same canonical via that fallback. Build clean;
      264/264 app tests pass, no regressions.
- [x] Task 2d: Mirror the magnitude-aware diagnostics fix in `@dyel/core` for parity
      (upkeep only, not a refactor target). (Target:
      `packages/core/src/load/generateDiagnostics.ts`, `packages/core/modifierEffects.json`;
      Test: `npm test -w packages/core`) — tracker task #4, blocked by 2a
      **Done, with a caveat flagged in code comments.** 291/291 core tests still green (no
      regressions) because this is currently a no-op in practice: core's own parser
      (`transform/parsers/nameToExercise.ts`'s `parseEquipment`) never extracted an equipment
      magnitude to begin with — a pre-existing legacy limitation, not introduced by this task.
      The key-construction + JSON entries are in place and correct (mirroring pipeline exactly),
      ready to activate if core's parser ever gains magnitude support; wiring that up would be a
      broader core refactor, explicitly out of scope for this parity-upkeep pass. Documented
      inline at the fix site in `generateDiagnostics.ts`.
- [x] Task 2e: Pipeline tests (tags, facets, diagnostics ranges, fallback regression
      guard). (Target: `packages/pipeline/src/tag/tag.test.ts`,
      `packages/pipeline/src/tag/detect/canonical.test.ts`,
      `packages/pipeline/src/analyze/*.test.ts`; Test: `npm test -w packages/pipeline`) —
      tracker task #5, blocked by 2a+2b
      **Done.** Fixed the one known-failing pre-existing test (deficit-deadlift range
      expectation, now correctly magnitude-specific). Added ~15 matrix (`it.each`) tests for
      board/blocks/deficit magnitude tags+ranges in `canonical.test.ts`, a default-magnitude
      coverage test in `tag.test.ts`, and 2 tests in `diagnose.test.ts` (distinct
      `expectedBaseline` per board magnitude + unmapped-magnitude fallback guard). Pipeline
      171/171, api 60/60, app 266/266, all builds clean.
- [x] Task 2f: RepCalculator test for distinct board-count e1RM resolution. (Target:
      `packages/app/src/pipeline/repCalculatorParity.test.ts`; Test:
      `npm test -w packages/app`) — tracker task #6, blocked by 2c
      **Done.** Added 2 tests at the `resolveE1RMEstimate`/`NormalizationModel` level
      (lower-effort + more precise than a full component test, since `effectiveCanonical`'s
      matching isn't extracted to a pure function): distinct variant-factor fixtures for
      `bench-board`/`bench-board-2` resolve to distinct e1RM estimates with 2-board higher;
      a second test covers deficit/blocks magnitude ordering too. 266/266 app tests, build
      clean.
- [x] Task 2g: Core parity tests for magnitude-aware diagnostics, if a suitable existing
      test file exists. (Target: `packages/core/src/load/generateDiagnostics.test.ts`;
      Test: `npm test -w packages/core`) — tracker task #7, blocked by 2d
      **Done.** Added 3 tests: magnitude-specific key resolution for board-2 and blocks-2
      (constructing fixtures with `equipmentMagnitude` set explicitly, since core's parser
      doesn't produce this field yet — see Task 2d caveat), plus a regression guard
      confirming exercises without `equipmentMagnitude` (i.e. all real-world core-parsed
      exercises today) still resolve to the unchanged base range. 294/294 core tests green.
- [x] Task 2h (QA): Full monorepo suite green (pipeline, api, app, core) + manual smoke
      test of RepCalculator and DiagnosticsPanel with 1-board vs 2-board fixture data.
      **Done — automated portion.** All 4 workspace builds clean; 791/791 tests green
      across pipeline (171), api (60), app (266), core (294). **Manual smoke test of the
      running app still outstanding** — not run in this pass (no dev server was started);
      recommend a human (or a follow-up pass) load a fixture with both 1-board and 2-board
      bench sessions and visually confirm distinct RepCalculator e1RM/weight predictions and
      distinct Diagnostics `expectedBaseline` ranges before merging.

## Status: implementation + automated verification complete

All 7 implementation/test tasks (2a-2g) and the automated portion of QA (2h) are done.
Nothing is committed yet — changes are all in the working tree on `migration-phase-1`.
Remaining before this can be considered fully closed: the manual dev-server smoke test
noted above, and a decision on whether/how to commit + PR this work (not yet requested by
the user).

## Non-goals (for this pass)

- Do not invent final physiological %-range numbers for 2-board/3-board etc. — flag as
  placeholder/needs-design in code comments and PR description, per
  `packages/pipeline/CLAUDE.md`'s "needs-design — flag, don't invent" convention.
- Do not broadly refactor `@dyel/core` — the core change is parity upkeep only, scoped
  to mirroring the same key-construction pattern.
