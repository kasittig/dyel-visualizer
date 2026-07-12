# Code Review — PR #470

**PR:** [App Refactor: migrate from @dyel/core to @dyel/pipeline, restructure packages/app into feature modules](https://github.com/kasittig/dyel-visualizer/pull/470)
**Branch:** `migration-phase-1` → `main`
**Reviewed:** 2026-07-11
**Method:** 8 independent finder angles (3 correctness, reuse/simplification/efficiency, altitude, CLAUDE.md conventions). **The verify pass was skipped by request — all findings are unverified candidates** and should be confirmed before acting. Finding 1 was independently reached by two angles and is high-confidence.

**Verification update (2026-07-11):** all 17 claims below were independently re-verified against the current code on `migration-phase-1` (file/line citations, `git diff main...HEAD` / `git log -p` against the claimed prior behavior, and downstream call-site tracing). Every finding CONFIRMED except one PLAUSIBLE (overstated) note. See inline ✅/⚠️ verdicts.

## Correctness

### 1. Composite charts lose carry-forward when a date range is set ⚠️ corroborated by two angles — ✅ CONFIRMED

- **File:** `packages/pipeline/src/dataset/build.ts:50`
- `buildDataset` now filters points to `ui.dateRange` (`scoped`) _before_ the composite carry-forward loop; the old code carried forward across full history and range-filtered the final rows. The composite gate `lastValues.every(v => v !== undefined)` then drops any timestamp where a component has no in-range value.
- **Failure scenario:** Lifter benches in December, squats/deadlifts in January; user selects a 2-week range containing only a squat session. Old: total = forward-filled Dec bench + Jan values. New: bench is `undefined` in-range → every composite row dropped → total/Wilks/DOTS charts render empty or truncated, and `getCompetitionTotal` returns `null`. Easy to hit because `TOTAL_CHART_SPECS` uses `derive: 'e1rm-max-effort'`, which excludes days with only speed work.
- **Fix direction:** Carry forward over full history, filter rows to the range last (the documented CompositeSpec contract in `dataset/CLAUDE.md`).
- **Verification:** `build.ts:50-52` filters `points` into `scoped` by `ui.dateRange` before the grid/carry-forward loop (lines 65-94); `git diff main...HEAD` confirms the old code built grids over unfiltered `points` and applied the range filter only to final `rows`. `packages/api/src/totalChartSpecs.ts:7` does use `derive: 'e1rm-max-effort'`, and that deriver returns `null` (not a speed-work fallback) on effort-only days, confirming the "easy to hit" claim.

### 2. Speed-work guard removed from `fitNormalizationModel` without a per-canonical fallback — ✅ CONFIRMED

- **File:** `packages/pipeline/src/derive/normalize.ts:154` (surviving protection: `packages/pipeline/src/pipeline.ts:101`)
- The deleted `effortOnly()` helper excluded speed sets from the baseline grid and variant fits but fell back to a canonical's own sets when it had _only_ speed work (`effort.length ? effort : records`). The replacement is a global pre-filter in `pipeline.ts` with no fallback.
- **Failure scenario:** A variant logged exclusively as speed work (e.g. "Speed Bench" always 3×3, no RPE) is dropped from `fitInput` entirely — no `variantFactor`/`baseline` computed, so it silently vanishes from normalized variation/radar output. Separately, `fitNormalizationModel` is still a public export but no longer self-protects: calling it with unfiltered history anchors the baseline grid on speed-work e1RMs (~9× inflated variant factors).
- **Verification:** `git log -p` on `normalize.ts` confirms the deleted `effortOnly()` helper and both call sites now use unfiltered `r`/`byCanonical[...]` (current lines 154, 184-187). `pipeline.ts:101`'s `fitInput` filter is global, not per-canonical, so a speed-work-only canonical is stripped before `byCan`/`byFam` and never reappears. `fitNormalizationModel` remains exported from `packages/pipeline/src/index.ts:20` with no internal guard.

### 3. Sheet validator dropped all per-row weight/reps/date validation — ✅ CONFIRMED

- **File:** `packages/api/src/validation/pipelineSheetValidator.ts:123-141`
- The old `validateSheetCsv` flagged per row: missing/non-numeric weight, missing/`<=0`/non-integer reps, out-of-range RPE, missing/invalid dates. The new loop only checks for an empty exercise name, then unconditionally counts the row as parsed. `headerRow` is also hardcoded to `0`, dropping the old preamble/header-index detection.
- **Failure scenario:** `2024-11-04,Bench,405,-3` validates as `verdict: 'ok', parsed: 1`; reps −3 flows into Epley producing a silently wrong e1RM with no error anywhere. A row with `not-a-date` in the date cell is likewise no longer reported.
- **Verification:** the predecessor (`packages/core/.../validateSheetCsv.ts` + `validateRow.ts`) genuinely flagged weight/reps/RPE/date; the current loop (`pipelineSheetValidator.ts:123-141`) only checks `!exerciseName` and hardcodes `headerRow: 0`. The existing test only passes because its bad row happens to also have an empty exercise field — reps `-1` and `not-a-date` are never independently checked.

### 4. Schwartz-Malone female coefficient typo (non-monotonic table entry) — ✅ CONFIRMED bug, but pre-existing (not introduced by this PR)

- **File:** `packages/api/src/strengthScores.ts:339`
- In `SCHWARTZ_MALONE_FEMALE`, the bodyweight-237 entry (`c: 0.5765`) is larger than both neighbors (236 → `0.5738`, 238 → `0.5754`) in an otherwise strictly decreasing table; the trend implies ~0.5727.
- **Failure scenario:** A female lifter at 237 lb gets a higher Schwartz-Malone score and percentile than a 236 lb lifter with the same total — strength score increases with bodyweight.
- **Verification:** table values at `strengthScores.ts:337-341` are `{235: 0.5757}, {236: 0.5738}, {237: 0.5765}, {238: 0.5754}, {239: 0.574}` — 237 does break the strictly-decreasing trend. `git log -S "0.5765"` traces this to commit `45a13a9` ("Fix calculateSchwartzMalone: replace sparse anchor table with reference per-pound table"), dated 2026-06-30 — before this branch's merge-base. **Real bug, but out of scope for this PR's fix list; file separately.**

### 5. Session date shifts a day in UTC+ timezones — ✅ CONFIRMED

- **File:** `packages/api/src/session/lastSessionDetail.ts:39`
- `new Date(date).toISOString().split('T')[0]` converts a local-midnight timestamp (`parseDate` uses `setHours(0,0,0,0)`) to UTC.
- **Failure scenario:** User in UTC+10 logs a session dated 2026-07-08; local midnight = `2026-07-07T14:00:00Z` → last-session panel shows 2026-07-07. Sibling code (`pipelineChartUtils.localDateKey`, `volume.ts`) correctly uses local getters; the unit test masks the bug by constructing dates at UTC midnight.
- **Verification:** `parseDate` (both `csv.ts:11-16` and `freeform/parser.ts:7-12`) uses `setHours(0,0,0,0)` (local midnight); `lastSessionDetail.ts:39`'s `toISOString()` renders in UTC. `pipelineChartUtils.ts:62-68` and `volume.ts:11-12` do use local getters as claimed. `lastSessionDetail.test.ts:26-27` constructs dates via `new Date('2026-01-15')`, a date-only ISO string that parses as UTC midnight per spec — masking the bug regardless of runner timezone, exactly as claimed.

### 6. CSV reps parsed with no NaN guard — ✅ CONFIRMED

- **File:** `packages/pipeline/src/parse/csv.ts:73`
- `parseInt(repsStr)` is used directly with no `isNaN` check; the required-field check only rejects empty strings. (The removed `if (reps === null)` guard was dead code — `parseInt` never returns `null` — so this was broken before the PR too, but the PR touches the function.)
- **Failure scenario:** A reps cell of `AMRAP`, `max`, or `-` emits `reps: NaN` → `calcE1RM(weight, NaN)` = NaN → `Math.max` poisons the entire day/series value, silently corrupting the chart instead of raising a `ParseError`.
- **Verification:** `csv.ts:73`'s `parseInt(repsStr)` has no `isNaN` guard; the deleted `if (reps === null)` check was indeed dead code (`parseInt` returns `NaN`, never `null`), confirming this was broken before the PR too. `calcE1RM(w, NaN, rpe)` returns `NaN`; `derivers.ts:24,32` feed results through `Math.max(...)`, which returns `NaN` if any argument is `NaN` — confirmed silent poisoning path.

### 7. Last-session date derived from max-effort sets only (moderate confidence) — ✅ CONFIRMED

- **File:** `packages/api/src/model/modelSelectors.ts:23`
- `collectSessionDates` iterates only `tabRows[lift].maxEffort`; the deleted `useLastSessionStats` fed all pairs into session stats.
- **Failure scenario:** The most recent training day is pure speed/volume work → `lastSessionDate` points to an older max-effort day, and `App.tsx` anchors the default date range to the wrong date.
- **Verification:** `modelSelectors.ts:23`'s `collectSessionDates` does `LIFT_TABS.flatMap(lift => tabRows[lift].maxEffort)` — max-effort only. The deleted `useLastSessionStats` (removed in `41ca0dd`) wrapped `@dyel/core`'s `buildSessionStats`, which looped over every `[exercise, session]` pair. `App.tsx:11,55,70-74` confirms `lastSessionDate` feeds `defaultDateRangeFromLastSession` directly.

### 8. Cross-feature barrel rule evaded by `../../features/...` import paths — ✅ CONFIRMED

- **Files:** `packages/app/src/features/validation/ValidatorPage.tsx:6-8`, `packages/app/src/features/validation/PipelineValidationPage.tsx:5`, `packages/app/src/features/index-page/useIndexData.ts:2`
- Four deep imports into `data-source` internals violate the CLAUDE.md cross-feature barrel rule ("a feature may import a sibling feature only via that feature's `index.ts` barrel"). They slip past ESLint because the guard patterns in `eslint.config.js` match `../data-source/*` but not the equivalent `../../features/data-source/*` form. The `data-source` barrel already exports every symbol involved.
- **Fix direction:** Switch the four imports to the barrel _and_ widen the ESLint patterns so the boundary enforces itself for both path shapes.
- **Verification:** all 4 imports confirmed as written (`ValidatorPage.tsx:6,8`, `PipelineValidationPage.tsx:5`, `useIndexData.ts:2`), all using the `../../features/data-source/*` form. `eslint.config.js:143-165`'s guard patterns (e.g. `'../data-source/*'`) require a literal `../data-source/` prefix and don't match the `../../features/...` form. `data-source/index.ts` does export all three symbols used (`EXAMPLE_SHEET_URL`, `InputModeToggle`, `publishedCsvUrl`), so barrel imports were available.

## Cleanup

### 9. kg→lbs factor `2.20462262185` inlined in three new files — ✅ CONFIRMED

- **Files:** `packages/api/src/getCompetitionTotal.ts:21`, `packages/api/src/volume/volume.ts:8`, `packages/api/src/strengthScores.ts:383`
- `weightUnit.ts` declares itself the single source of truth ("do not reintroduce local KG_TO_LBS constants elsewhere") and provides `convertWeight`/`roundWeight`. `getCompetitionTotal.ts:21` is a verbatim reimplementation of `roundWeight`.
- **Cost:** Three drifting copies of the conversion; a future correction silently diverges competition totals, tonnage, and strength scores from every other converted weight.
- **Verification:** `weightUnit.ts` defines `KG_TO_LBS = 2.20462262185` with the "do not reintroduce" comment; all three cited files (`getCompetitionTotal.ts:21`, `volume.ts:8`, `strengthScores.ts:383`) literally reinline the same constant at the exact lines cited.

### 10. Per-deriver recomputation in the pipeline hot path — ✅ CONFIRMED

- **File:** `packages/pipeline/src/pipeline.ts:122` (also `:134`, `:107-110`)
- `offsetAdjustRecords(tagged, model)` is called inside the `allDeriverIds.map(...)` callbacks in both adjusted-map builders, and `buildPoints`/`buildPointsByLabel` each re-run `Map.groupBy` over all tagged records per deriver — 8+ full O(records) allocating passes per `runPipelineModel` call (each sheet load / athlete change).
- **Cheaper form:** Hoist one `adjusted` array and one grouping per key shape (canonical, label) above the map builders. Related smaller item: `packages/api/src/conjugate/conjugateBestSet.ts:29-31` recomputes `calcE1RM` for the reduce accumulator every step (~2n calls instead of n).
- **Verification:** `offsetAdjustRecords` is called inside `allDeriverIds.map(...)` at `pipeline.ts:120,134`; `buildPoints`/`buildPointsByLabel` each run a fresh `Map.groupBy` per deriver id across 4 map builders — confirmed redundant O(records) passes beyond 8 whenever an `addlWtOffset` canonical exists. `conjugateBestSet.ts:29-31`'s reduce recomputes `calcE1RM(a...)` every iteration — confirmed ~2(n-1) calls instead of n.

### 11. Build artifact committed — ✅ CONFIRMED

- **File:** `packages/pipeline/tsconfig.tsbuildinfo`
- Git-tracked and not covered by any `.gitignore`; it's a machine-specific TypeScript incremental-compilation cache rewritten on every `tsc -b`.
- **Fix:** Delete it and add `*.tsbuildinfo` to `.gitignore`.
- **Verification:** `git ls-files | grep tsbuildinfo` returns `packages/pipeline/tsconfig.tsbuildinfo`; neither root `.gitignore` nor `packages/pipeline` (which has no `.gitignore` at all) covers it.

## Lower-priority notes (cut for severity, worth a look)

- **Duplicated date helpers:** `volume/volume.ts:12` hand-rolls `localDateKey` (byte-identical to `pipelineChartUtils.ts:67`); `features/lift/VariationRadarChart.tsx:47` re-implements `formatChartDate` without its `isNaN` fallback. Volume keys are joined against chart-point dates, so the copies must not drift. — **✅ CONFIRMED**: the date-key template literal is verbatim-identical in both files; `VariationRadarChart.tsx:47` inlines `toLocaleDateString` directly, missing `pipelineChartUtils.ts:55-59`'s `isNaN(d.getTime())` fallback.
- **ESLint carve-out growth:** the "components must be render-only" rule requires a per-file exception for every display formatter/constant because they share the `@dyel/api` barrel with derivation functions. A `@dyel/api/display` subpath export would make the boundary structural instead of a maintained allowlist (`eslint.config.js:91-138`). — **✅ CONFIRMED**: `eslint.config.js:90-138` is the render-only allowlist, currently 7 per-file/glob exceptions.
- **Dead barrel exports:** `packages/api/src/index.ts` re-exports `selectBestE1RMPoint` (line 82), `mergeWideRechartsRows` (77), and `facetFamilyKey` (33) with no external consumers — phantom public API surface. — **✅ CONFIRMED**, with a nuance: `mergeWideRechartsRows`/`facetFamilyKey` do have one internal same-package consumer each, but reached via a relative import, not the barrel — so the _barrel re-export itself_ has zero consumers repo-wide, as claimed. `selectBestE1RMPoint` has zero consumers anywhere outside its own file/test.
- **Redundant field pair:** `packages/app/src/app/useVisualizerData.ts:53-54` returns `baselineCanonicals` and `targetCanonicals` as the same object under two names, falsely implying independent derivations. — **✅ CONFIRMED** verbatim at those lines.
- **Hardcoded special cases:** deadlift-stance branches in `packages/pipeline/src/tag/detect/canonical.ts:89-137` and per-equipment magnitude regexes in `parseExercise.ts:77-86` could be data-driven via `modifier-effects.json`, matching the rest of the tag/effect engine. — **⚠️ PLAUSIBLE, overstated**: the hardcoded branches are real (stance-key routing at `canonical.ts:131-145`; 3 hand-written regexes at `parseExercise.ts:77-86`), but the deadlift-stance _effects_ already flow through `modifier-effects.json` (`stance:sumo:deadlift`/`stance:conventional:deadlift`) via the same `add()`/`applyRange()` path as the rest of the engine — only the key-routing logic is hardcoded, not the effect data. The magnitude regexes don't fit the existing JSON schema (which maps resolved keys to effects/min/max, not raw-string extraction patterns) without a new data shape, so "matching the rest of the engine" isn't a drop-in claim.
- **Diagnostics semantics question (low confidence):** for ranged variants, `diagnose.ts:60` derives status from the fitted historical factor rather than the latest session's ratio, so a "weakness" classification never updates from new training data. May be intended "typical relationship" semantics. — **✅ CONFIRMED as described**: `diagnose.ts:67-77` uses `factor` (fit once per pipeline run over full history) when `range` exists, and only falls back to the latest-session `ratio` when `range` is absent. `packages/pipeline/src/analyze/CLAUDE.md` documents both mechanisms as intentional, supporting the reviewer's "might be intended" hedge over calling it a bug.
