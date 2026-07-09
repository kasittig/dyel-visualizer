# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Task 13 (`DiagnosticsPanel`, issue
#461) and Task 14 (`ConjugateCharts`, issue #459) are both complete (dropdown deprecated,
residual explicitly accepted — see "Prior Session Progress" below). **This session** did two
things: (1) a small, unrelated dead-code cleanup (`TabState.targetName` removal), and (2) a
deep root-cause investigation into `VariationRadarChart`'s (issue #460) parity-test
divergence numbers, which turned out to be **test-harness bugs, not real pipeline
regressions**. Two genuine bugs were found and fixed in the test harness itself; runtime
component code was never touched. `VariationRadarChart`'s actual swap-over is still open —
see "Open TODOs".

## Progress Overview (this session)

### 1. `TabState.targetName` removed (dead code cleanup)

- `TabState.targetName` (`packages/app/src/utils/appUtils.ts`) had been permanently dead
  since Task 14 removed `ConjugateCharts`' dropdown (nothing sets it anymore). Removed the
  field; `computeEffectiveNames` (`appDataUtils.ts`) now computes the effective target
  directly via `defaultCompExerciseName(...)`, same as baseline, instead of
  `tabState[tab].targetName ?? defaultCompExerciseName(...)`.
- Discovered `TabState.baselineName` was **also** fully dead (write-only, never read anywhere)
  — the entire `tabState` piece of `App.tsx` state (including its `'dyel:tabState'`
  localStorage persistence and three `setTabState(initialTabState())` reset calls) was
  removed as a result, not just the one field. Verified via grep that zero runtime references
  to `tabState`/`setTabState` remain anywhere in the app.
- `computeEffectiveNames`'s signature dropped its now-unused `tabState` parameter
  (`noUnusedParameters` is enforced); all 6 call sites updated (`App.tsx` + 5 parity test
  files that called `computeEffectiveNames(tabRows, initialTabState(), 'sumo')` →
  `computeEffectiveNames(tabRows, 'sumo')`, dropping now-unused `initialTabState` imports
  where applicable).
- Verified independently (not just trusting the implementing subagent): `npm run build -w
packages/app` clean, `npm test -w packages/app` 25 files/244 tests green.

### 2. `VariationRadarChart` divergence root-caused — it was the test, not the pipeline

The user asked to look at `VariationRadarChart`'s (issue #460) parity numbers before deciding
whether to proceed with its pipeline swap. Initial numbers from
`variationRadarChartParity.test.ts`'s existing `'%s: normalized variation snapshots'` test
looked alarming and inconsistent (squat 13.9%, bench 23.2%/26.1%, deadlift 5.6% — much larger
and less consistent than `ConjugateCharts`' accepted 0.0%/0.7%/0.4% baseline). Root-caused in
three stages, each verified by direct re-run (not trusting subagent-reported numbers blind):

1. **Semantic mismatch (not the main bug, but noted)**: the existing test's
   `legacySnapshots` (via `snapshotVariationsFromLegacy` → `normalizeToBaseE1RM`) computes a
   _cross-exercise-normalized_ value (variation's last session projected onto the target
   exercise's scale via fitted `variantFactor`), while `pipelineSnapshots` (via
   `snapshotVariationsFromPipeline`) reads a _raw, unconverted_ per-variation e1RM. Added a
   second, apples-to-apples `'%s: raw variation snapshots'` test (`legacyRawSnapshots` vs.
   `pipelineSnapshots`, both un-normalized) to isolate this from real bugs.
2. **Real bug #1 — wrong pipeline dataset shape passed to `snapshotVariationsFromPipeline`**:
   the test called `snapshotVariationsFromPipeline(mergeWideRechartsRows(res.datasets
.variations, 'lbs'), 'lbs')`, but `snapshotVariationsFromPipeline`
   (`packages/app/src/utils/variationSnapshot.ts`) expects the **raw** `RechartsRow[]`
   (`.t`-keyed, kg-valued) and does its own "most recent row" selection (via `.t`) and its own
   kg→lbs conversion. `mergeWideRechartsRows` had already converted `.t` → `.date` (string)
   and kg → lbs, so (a) the `.t` comparison inside `snapshotVariationsFromPipeline` always
   silently failed and fell back to the **first** row instead of the true most-recent one, and
   (b) its `conv()` **double-applied** the kg→lbs conversion on top of already-converted
   values (~2.2x inflation). Fixed by passing `res.datasets.variations` directly (no
   `mergeWideRechartsRows` wrapper); removed the now-unused import.
3. **Real bug #2 — spurious unit conversion on the legacy side**: `snapshotVariationsFromLegacy`
   (`packages/app/src/testUtils/diffVariationSnapshot.ts`) multiplied `normalizeToBaseE1RM`'s
   output by a kg→lbs `conv()` factor. But `@dyel/core`'s `TrainingSession.weight` is **never**
   unit-converted internally (unlike `@dyel/pipeline`'s always-kg `SetRecord.weight`) — it
   stays in whatever unit the source sheet declared (this fixture: lbs). So the legacy value
   was already in lbs, and `conv()` inflated it by another ~2.2x — the same double-conversion
   class of bug as #2, just on the other side. Confirmed by manually tracing a specific
   session (`Squat`, 2026-06-22, 185lbs×3@RPE9 → `calcE1RM` = 209.67) through both paths.
   Fixed by removing the conversion entirely (`Math.round(normalized)`, no `conv()`),
   mirroring `buildVariationChartData`'s own (already-correct) precedent of never converting
   legacy values. Dropped the now-unused `unit` parameter and `getConverter`/`KG_TO_LBS`
   constants; updated the one call site and this session's own `legacyRawSnapshots` code
   (which had copy-pasted the same wrong convention) to match.

**Real, trustworthy residual after both fixes** (verified via direct `npx vitest` re-run, not
subagent-reported):

- Raw (un-normalized) apples-to-apples: squat 0.0%, bench 0.0%, deadlift 0.0% — pipeline's
  raw per-variation e1RM computation is exactly correct.
- Normalized (target-relative, via `normalizeToBaseE1RM` vs. pipeline's `normalize: true`
  composite semantics): squat 0.0%, deadlift 1.9%, **bench 21.5%**.

The remaining bench 21.5% is believed to be the genuine, still-real semantic gap from finding
#1 above (pipeline lacks a per-variation `normalizeToBaseE1RM`-equivalent primitive — same
missing-feature class as `ConjugateCharts`' deprecated dropdown), not a residual bug — but
this was not separately re-root-caused this session; flagged as the next thing to check if
`VariationRadarChart`'s swap proceeds.

- Full verification green throughout: `npm run build -w packages/app` clean, `npm test -w
packages/app` 25 files/247 tests (+3 for the new raw-snapshot `it.each` block).

## Decisions Made & Rationale (this session)

- **Did not accept the original divergence numbers at face value.** Per the auto-mode
  guidance to dig rather than guess on "is this a real regression" questions, root-caused
  fully (three iterations, each independently re-verified by direct `npx vitest` runs rather
  than trusting subagent-reported numbers) instead of either (a) blindly applying
  `ConjugateCharts`' "explicitly accept the residual" precedent to numbers that turned out to
  be mostly artifact, or (b) recommending a real pipeline-side feature investment
  (`normalizeToBaseE1RM`-equivalent) before confirming the gap was real.
- **Fixed test-harness bugs directly, left runtime code untouched.** Both real bugs found were
  scoped to `packages/app/src/testUtils/diffVariationSnapshot.ts` and
  `packages/app/src/pipeline/variationRadarChartParity.test.ts` — no changes to
  `VariationRadarChart.tsx`, `conjugateChartSpecs.ts`, `packages/app/src/utils
/variationSnapshot.ts`, or any `@dyel/pipeline`/`@dyel/core` runtime code. Consistent with
  this repo's parity-test-harness convention (`packages/app/src/testUtils/CLAUDE.md`): fix the
  comparison, don't paper over it with tolerance, and don't touch runtime code to chase a
  test-only artifact.
- **`TabState.targetName` removal was scoped to "just the field" per the user's request, but
  expanded to the whole dead `tabState` state** once grep confirmed `baselineName` was
  equally unread — leaving a half-dead `tabState` (still persisting a fully write-only object
  to localStorage) would have violated the "avoid duplication/dead code" convention for no
  benefit.

## Open TODOs

1. **`VariationRadarChart` swap-over (issue #460, `MIGRATION_PLAN.md` item #1) is still not
   started.** Now that the parity numbers are trustworthy (squat/deadlift ~0%, bench 21.5%),
   the real open question is narrower than before: is bench's 21.5% the known
   missing-primitive gap (per-variation cross-exercise normalization, same class as
   `ConjugateCharts`' deprecated dropdown), and if so, is the plan still "deprecate/simplify
   the per-variation-target semantic" (mirroring `ConjugateCharts`), or does
   `VariationRadarChart`'s UX actually depend on it in a way that requires the real pipeline
   primitive? Worth a quick confirmation before implementing — not purely mechanical.
2. **`LiftTabPanel.md` (`MIGRATION_PLAN.md` item #2)** — composition-root swap, blocked on #1.
3. Consider whether `TabState` (now emptied of both fields — check if the type/`initialTabState`
   are themselves fully dead) should be removed entirely as a further cleanup. Not resolved
   this session; flagged only.
4. `migration/ValidatorPage.md` — still blocked on an unrelated scope decision, unchanged.

## Prior Session Progress (for reference — ConjugateCharts swap, closes #459)

- Implemented the real `ConjugateCharts` swap onto `@dyel/pipeline`; deprecated the
  "Competition variation" dropdown entirely on explicit user direction (no pipeline-native
  equivalent existed for its per-target normalization).
- Extended `@dyel/pipeline`: `PipelineModel.tagged`, exported `isSpeedWork`.
- New `packages/app/src/pipeline/conjugateBestSet.ts`, new
  `hooks/pipeline/usePipelineConjugateChartData.ts`; `hooks/conjugate/useConjugateChartData.ts`
  deleted.
- Residual (bench 0.7%/deadlift 0.4%) explicitly accepted, matching `TotalChart`'s own
  baseline.
- Fixed `conjugateChartParity.test.ts`'s test-harness bug (unfiltered `pairs` passed to
  `buildSessionStats` instead of `allSigmaPairs` built from `tabRows.*.maxEffort`) — commit
  `a102a4d`. Note: this exact bug pattern was independently found to **not** yet be present in
  `variationRadarChartParity.test.ts` (it does build `allSigmaPairs` correctly as of this
  session — verify it wasn't reintroduced if this file is touched again).

## Prior-Prior Session Progress (for reference)

- Root-caused issue #459's stale parity numbers via bisection + production data-flow tracing;
  reverted a false-premise fix attempt on `packages/pipeline/src/pipeline.ts`'s `fitInput`
  filter (correct as-is). See `b1b6a65`.

## Files Touched (this session)

- `packages/app/src/utils/appUtils.ts` — removed `TabState.targetName`.
- `packages/app/src/utils/appDataUtils.ts` — `computeEffectiveNames` no longer takes
  `tabState`; target computed via `defaultCompExerciseName` directly.
- `packages/app/src/App.tsx` — removed dead `tabState` state/localStorage persistence/reset
  calls entirely; updated `computeEffectiveNames` call site.
- `packages/app/src/pipeline/conjugateChartParity.test.ts`,
  `diagnosticsPanelParity.test.ts`, `sigmaTabParity.test.ts`, `totalChartParity.test.ts` —
  updated `computeEffectiveNames` call sites (dropped `initialTabState()` arg).
- `packages/app/src/pipeline/variationRadarChartParity.test.ts` — updated
  `computeEffectiveNames` call site; added apples-to-apples raw-snapshot test; fixed the
  `snapshotVariationsFromPipeline` call site (removed erroneous `mergeWideRechartsRows`
  wrapper, dropped now-unused import); removed spurious unit conversion from its own raw
  snapshot code.
- `packages/app/src/testUtils/diffVariationSnapshot.ts` — fixed `snapshotVariationsFromLegacy`
  to stop double-converting already-native-unit legacy values; dropped unused `unit` param and
  `getConverter`/`KG_TO_LBS` constants.
- `HANDOFF.md` — this update.

## Suggested Next Skills

- No specific skill — next session should start by confirming Open TODO #1 (what bench's
  remaining 21.5% normalized-snapshot gap actually is, and whether `VariationRadarChart`'s
  swap should follow `ConjugateCharts`' "deprecate the dependent feature" precedent or needs a
  real pipeline-side `normalizeToBaseE1RM`-equivalent), then proceed with the swap and
  `LiftTabPanel` composition-root wiring if resolved.
