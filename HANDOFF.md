# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Tasks 13 (`DiagnosticsPanel`, #461),
14 (`ConjugateCharts`, #459), and **now `VariationRadarChart` (#460, this session)** are all
complete. Only `LiftTabPanel` (the composition root, `MIGRATION_PLAN.md` item #2) and the
off-to-the-side `ValidatorPage` scope question remain.

## Progress Overview (this session)

Picked up from last session's Open TODO #1: resolve whether `VariationRadarChart`'s
remaining bench 21.5% normalized-snapshot divergence was the known missing-primitive gap
(same class as `ConjugateCharts`' deprecated dropdown), and proceed with the swap if so.
Confirmed via review of `migration/ConjugateCharts.md`'s already-documented precedent (its
own per-target `normalizeToBaseE1RM`-based normalization was deprecated in favor of
pipeline's fixed lift-family baseline) and `APP_COMPONENTS.md`/`MIGRATION_PLAN.md`'s explicit
"re-evaluate whether the same explicit-acceptance approach can unblock this swap" framing —
this was the same gap, not a new one. Also confirmed `VariationRadarChart`'s `targetName`
prop is _already_ a fixed default (`defaultCompExerciseName`, not user-selectable — the
dropdown that fed it was removed from `ConjugateCharts` entirely, and `App.tsx`'s
`effectiveTargetNames`/`effectiveBaselineNames` have been computed identically since last
session's dead-code cleanup), so there was no live interactive feature actually being
dropped here, unlike `ConjugateCharts`' dropdown.

Delegated implementation across three sequential, independently-verified subagent tasks
(each verified independently by direct `npm run build`/`npm test` re-run, not trusting
subagent-reported numbers blind — one subagent needed a correction: see "Decisions Made"):

1. **New hook `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.ts`** (+
   colocated test, 7/7 passing) — sourced entirely from the shared `PipelineModel` via
   `usePipelineModel()`/`usePipelineDatasets(conjugateChartSpecs(liftType), {})`, never
   calls `runPipeline` directly. Returns `{ snapshot, lastSessionByLabel }`: a raw
   (un-normalized) per-variation e1RM map (`utils/variationSnapshot.ts`'s
   `snapshotVariationsFromPipeline`) and last-session tooltip detail
   (`pipeline/lastSessionDetail.ts`'s `buildLastSessionDetail`). Exported from
   `hooks/pipeline/index.ts`; documented in `hooks/pipeline/CLAUDE.md`.
2. **Swapped `components/charts/VariationRadarChart.tsx` and
   `components/pages/LiftTabPanel.tsx`** off `@dyel/core` onto the new hook.
   `VariationRadarChart`'s prop shape changed from `{ rows, stats, targetName,
baselineName, onVariationClick }` to `{ liftType, unit, targetName, onVariationClick }`
   — `baselineName` is gone entirely (it only ever fed `normalizeToBaseE1RM`'s addlWtOffset
   correction, now moot). Radar spokes now show each variation's raw last-session e1RM
   instead of a cross-exercise-normalized value; the target ring (`targetE1rm`) is
   unchanged in spirit (`stats.lastSession.get(targetName)?.e1rm` was _already_ raw in the
   legacy code, never normalized). Tooltip now reads `LastSessionDetail` (ISO date string,
   kg weight — converted inline via the same `KG_TO_LBS` pattern used elsewhere in this
   migration) instead of `SessionStats.lastSession`.
   `LiftTabPanel.tsx`'s now-fully-unused `rows`/`effectiveBaselineNames`/`baselineName`
   props, `filteredRows` `useMemo`, and `useLastSessionStats` call were removed as dead
   code — this cascaded a small prop-signature change to `LiftTabPanel`'s one caller,
   `App.tsx` (confirmed safe: `tabRows`/`effectiveBaselineNames` are still used elsewhere in
   `App.tsx`, just no longer passed to this one child).
3. **Promoted `variationRadarChartParity.test.ts`'s raw-snapshot test from soft-warn to a
   hard assertion** (`expect(maxRelDiff).toBe(0)`), since that's the data path that now
   actually ships in production, per this repo's "promote to hard-assert once divergence
   resolved" convention. Live re-run confirmed exact-match numbers (squat 210/210, bench
   200/200, deadlift 265/265 — 0.0% across the board) before promoting. The unrelated
   normalized-snapshot test (cross-exercise, bench ~21.5%) was left untouched, soft-warn
   only, with a comment noting it's no longer relevant to production and is retained purely
   as a historical/tracked measurement.

**Full verification, independently re-run after each step (not just subagent-reported)**:
`npm run build -w packages/pipeline && npm run build -w packages/core && npm run build -w
packages/app` clean; `npm test -w packages/pipeline` (12 files/144 tests), `npm test -w
packages/core` (22 files/321 tests), `npm test -w packages/app` (26 files/254 tests) —
all green, zero regressions. `grep -rn "@dyel/core"` on both swapped files returns nothing
except `LiftTabPanel.tsx`'s two remaining type-only imports (`DeadliftStancePreference`,
`LiftType` — not runtime business logic).

Documentation updated to close out #460: `migration/VariationRadarChart.md` (new
"Root-caused stale divergence numbers" + "VariationRadarChart swap-over" sections),
`MIGRATION_PLAN.md` (item #1 marked complete, item #2 unblocked), `APP_COMPONENTS.md`
(moved `VariationRadarChart` out of "Ready to migrate" into the completed list, updated the
`LiftTabPanel.tsx` row out of the "Not yet migrated" table since only type-only imports
remain there now).

## Decisions Made & Rationale (this session)

- **Deprecated `VariationRadarChart`'s cross-exercise per-target normalization rather than
  porting it**, applying `ConjugateCharts`' already-established precedent (see
  `migration/ConjugateCharts.md`'s "ConjugateCharts swap-over" section) to a second
  component, per the explicit "re-evaluate whether the same approach unblocks this swap"
  framing already present in `MIGRATION_PLAN.md`/`APP_COMPONENTS.md` from prior sessions.
  This was a reasonable-call decision under auto-mode, not a fresh unprompted feature
  decision — the precedent, rationale, and even the specific "next session should decide
  this" flag were already on record from two sessions back.
- **This swap is a genuine gate-pass, not another soft-warn exception like
  `ConjugateCharts`.** The raw per-variation e1RM snapshot — the data path that actually
  ships — has real, hard-asserted 0.0% parity, not an accepted nonzero residual. Framed
  this distinction explicitly in `APP_COMPONENTS.md`'s "Status" section so it isn't
  conflated with `ConjugateCharts`' explicit-exception precedent.
- **Caught and corrected a subagent deviation from instructions.** The `VariationRadarChart`
  swap task explicitly instructed the implementing agent to stop and report back if removing
  now-dead props from `LiftTabPanel.tsx` would cascade into a prop-signature change on its
  caller (`App.tsx`), rather than making that change itself. The agent made the cascading
  change anyway (removing `rows`/`effectiveBaselineNames`/`baselineName` from `App.tsx`'s
  `<LiftTabPanel>` call site). Per this session's "trust but verify" practice, the actual
  diff (not just the subagent's summary) was reviewed directly — the change was a clean,
  minimal 3-line removal, and independently confirmed safe (`tabRows`/`effectiveBaselineNames`
  are still used elsewhere in `App.tsx` for other consumers, e.g. `sigmaStats`/
  `RepCalculator`), so it was accepted rather than reverted-and-redone. Flagging the
  deviation here in case the pattern recurs with a less-clean diff in a future session.
- **Left the bench ~21.5% normalized-snapshot divergence as a permanently soft-warned,
  historical-only test.** Since `VariationRadarChart.tsx` no longer consumes that value in
  production at all, there's no remaining reason to root-cause it further (unlike
  `ConjugateCharts`' 0.7%/0.4%, which _is_ still in production and thus stays on the "revisit
  if pipeline gains a real primitive" list).

## Open TODOs

1. **`LiftTabPanel.md` (`MIGRATION_PLAN.md` item #2, composition root) — now unblocked, not
   started.** Note before picking this up: `migration/LiftTabPanel.md`'s existing plan is
   partially stale — it was written assuming `LiftTabPanel.tsx` still calls
   `filterByDateRange` from `@dyel/core`, but this session's swap already removed that
   entirely (it was only needed to build `VariationRadarChart`'s now-deleted `filteredRows`
   prop). What's left on `@dyel/core` in that file is just two type-only imports
   (`DeadliftStancePreference`, `LiftType`) — confirm whether that's still enough to
   warrant a dedicated migration doc/parity test, or whether it's now trivial enough to
   just swap the two type imports for pipeline-native equivalents directly without the
   originally-planned `liftTabPanelParity.test.ts` date-range-filtering parity test (which
   may no longer be meaningful now that the component doesn't do any filtering itself).
   Also re-check the `deadliftStance`-on-`AthleteContext` prerequisite this doc references
   (`HANDOFF.md` Part A, from an older session) is still accurate/complete before assuming
   it's fully resolved.
2. **`migration/ValidatorPage.md`** — still blocked on an unrelated scope decision, unchanged
   from prior sessions.
3. Consider whether `TabState` (flagged last session as now-emptied of both fields) should
   be removed entirely. Not resolved this session; still flagged only, not touched.

## Prior Session Progress (for reference — dead-code cleanup + VariationRadarChart root-cause)

- Removed dead `TabState.targetName`/`baselineName` and the entire unused `tabState`
  App.tsx state/localStorage mechanism (see commit `0f6da6f`).
- Root-caused `VariationRadarChart`'s alarming parity numbers to two test-harness bugs
  (wrong pipeline dataset shape passed to `snapshotVariationsFromPipeline`; spurious
  unit-conversion on the legacy side) — see commit `61566e0` and the "Root-caused stale
  divergence numbers" section now folded into `migration/VariationRadarChart.md`.

## Prior-Prior Session Progress (for reference — ConjugateCharts swap, closes #459)

- Implemented the real `ConjugateCharts` swap onto `@dyel/pipeline`; deprecated the
  "Competition variation" dropdown entirely (no pipeline-native equivalent existed for its
  per-target normalization) — the direct precedent this session's `VariationRadarChart`
  swap followed.
- Extended `@dyel/pipeline`: `PipelineModel.tagged`, exported `isSpeedWork`.
- Residual (bench 0.7%/deadlift 0.4%) explicitly accepted, matching `TotalChart`'s own
  baseline — still soft-warned, still in production (unlike this session's swap).

## Files Touched (this session)

- `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.ts` (new),
  `usePipelineVariationRadarData.test.ts` (new) — pipeline-native data hook for
  `VariationRadarChart`.
- `packages/app/src/hooks/pipeline/index.ts` — exported the new hook (+ a missing
  `usePipelineConjugateChartData` export that was referenced in `CLAUDE.md` but not
  actually exported; fixed as a drive-by).
- `packages/app/src/hooks/pipeline/CLAUDE.md` — documented the new hook.
- `packages/app/src/components/charts/VariationRadarChart.tsx` — swapped off `@dyel/core`
  onto `usePipelineVariationRadarData`; new prop shape.
- `packages/app/src/components/pages/LiftTabPanel.tsx` — updated call site; removed dead
  `rows`/`effectiveBaselineNames`/`baselineName`/`filteredRows`/`useLastSessionStats`.
- `packages/app/src/App.tsx` — updated `<LiftTabPanel>` call site (cascaded prop removal).
- `packages/app/src/pipeline/variationRadarChartParity.test.ts` — promoted raw-snapshot
  test to a hard assertion; added a comment to the (untouched) normalized-snapshot test
  noting it's now production-irrelevant/historical-only.
- `migration/VariationRadarChart.md` — added "Root-caused stale divergence numbers" and
  "VariationRadarChart swap-over" sections.
- `MIGRATION_PLAN.md` — item #1 marked complete; item #2 unblocked.
- `APP_COMPONENTS.md` — moved `VariationRadarChart` to the completed list; updated
  `LiftTabPanel.tsx`'s "Not yet migrated" table entry.
- `HANDOFF.md` — this update.

## Suggested Next Skills

- No specific skill — next session should start with Open TODO #1 (`LiftTabPanel`
  composition-root swap), re-scoping `migration/LiftTabPanel.md`'s plan first since it's
  partially stale (see TODO #1 detail above) before implementing.
