# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Task 13 (`DiagnosticsPanel`, issue
#461) is complete. The previous session fixed `conjugateChartParity.test.ts`'s test-harness
bug (see "Prior Session Progress" below) and flagged an open gate-status policy question
rather than deciding it. **This session got explicit direction to proceed anyway** ("continue
w/task 14") and implemented the real `ConjugateCharts` swap-over (`MIGRATION_PLAN.md` item
#1, issue #459) — not another dry-run-and-revert. Mid-implementation, a second, more
significant gap was found (the "Competition variation" normalization-target dropdown has no
pipeline-native equivalent) and flagged to the user before proceeding; **explicit direction
was given to deprecate that dropdown entirely** rather than port it. Working tree has this
session's changes committed or ready to commit — see "Files Touched" below.

## Progress Overview (this session — ConjugateCharts swap, closes #459)

- **Implemented the real `ConjugateCharts` swap onto `@dyel/pipeline`**, superseding the
  prior wire-verify-revert dry runs — this is a committed behavior change, not another
  verify-then-revert pass.
- **Found and flagged a scope gap before implementing**: `conjugateChartSpecs.ts`'s
  `normalized` composite has no per-target parameter — it always normalizes to the model's
  fixed lift-family baseline, while legacy's `buildVariationChartData` normalized to
  whatever variation the user had selected via `ConjugateCharts`' "Competition variation"
  dropdown. Silently swapping would have made that dropdown cosmetic (a real interactivity
  regression, not just a numeric approximation) — flagged this explicitly rather than
  guessing, since it changes real user-facing behavior.
- **User decided: deprecate the dropdown entirely, don't port it.** Implemented accordingly
  — `ConjugateCharts.tsx` no longer has a target-selection UI; the normalized composite
  always tracks the model's fixed baseline, matching `TotalChart`/`SigmaTab`'s existing
  pattern.
- **Extended `@dyel/pipeline`**: `PipelineModel` now also exposes `tagged: TaggedSetRecord[]`
  (needed for per-set detail — sets/reps/weight/rpe — that day-collapsed `Point`s don't
  carry); `isSpeedWork` is now exported from the package's public `index.ts`.
- **New pipeline-native util** `packages/app/src/pipeline/conjugateBestSet.ts`
  (`buildBestSetByLabelAndDate`) — preserves the chart tooltip's best-set detail
  (sets/reps/weight/RPE) that legacy's `bestSetByLabelAndDate` provided, without needing
  `@dyel/core`.
- **New hook** `packages/app/src/hooks/pipeline/usePipelineConjugateChartData.ts` replaces
  the deleted `hooks/conjugate/useConjugateChartData.ts`; follows the same
  `usePipelineModel()`/`usePipelineDatasets()` pattern as `usePipelineTotalChartData.ts` —
  no per-component `runPipeline()` calls, per the shared-context architectural constraint.
- **`ConjugateCharts.tsx`** now takes `{ liftType, dateRange, unit, highlightedVariation?,
onVariationClick? }` instead of `{ rows, baselineNames, stats, targetName, onTargetChange }`;
  imports `LINE_COLORS` from `@dyel/pipeline` instead of `@dyel/core`; zero `@dyel/core`
  references remain in the component or its data hook.
- **`LiftTabPanel.tsx`/`App.tsx`** updated: new `unit` prop threaded from `App.tsx`'s existing
  `dataUnit`; `onTargetChange` removed entirely from `LiftTabPanel`'s props (dead once
  `ConjugateCharts`' dropdown was gone — `VariationRadarChart` never called it).
  `VariationRadarChart`'s own `targetName`/`stats`/`rows` plumbing is untouched (still
  `@dyel/core`-backed, still issue #460's separate concern, not in scope this session).
- **Full verification green**: `npm run build -w packages/pipeline && npm run build -w
packages/app && npm test -w packages/pipeline && npm test -w packages/app` — pipeline 12
  files/144 tests, app 25 files/244 tests (+1 file/+8 tests for the new
  `conjugateBestSet.test.ts`), no regressions. Dev server left running on port 5173 for
  manual visual verification per usual workflow.
- **Docs updated**: `MIGRATION_PLAN.md`, `APP_COMPONENTS.md`, `TASK_LIST.md`, and
  `migration/ConjugateCharts.md` (new "ConjugateCharts swap-over" section) all updated to
  reflect the swap as DONE, including the dropdown-deprecation decision and its rationale.

## Decisions Made & Rationale (this session)

- **Proceeded past the prior session's open gate-status question** on explicit user
  direction ("continue w/task 14") rather than waiting for further discussion — the residual
  divergence (bench 0.7%/deadlift 0.4%, matching `TotalChart`'s own baseline) is now
  explicitly accepted, not just flagged.
- **Stopped and asked before shipping the dropdown-removal** rather than silently dropping
  or silently keeping broken behavior — this was a genuine "decision only the user can make"
  moment (auto-mode's guidance to ask when the shape of the task calls for it), since it's a
  real user-facing feature change, not an internal implementation detail. Got explicit
  direction to deprecate, then implemented that directly (no further back-and-forth needed).
- **Did not touch `VariationRadarChart`/`LiftTabPanel` composition-root swaps** (issue #460,
  `MIGRATION_PLAN.md` item #1 now) — those were explicitly out of scope for "Task 14"
  specifically (`ConjugateCharts` only); `VariationRadarChart`'s own `targetName` feature is
  a distinct radar-chart concept unaffected by today's dropdown deprecation.
- **Removed `onTargetChange` from `LiftTabPanel`/`App.tsx` entirely** rather than leaving it
  wired-but-unused — it had no remaining caller once `ConjugateCharts`' dropdown was gone,
  and leaving dead plumbing around would violate the "avoid duplication/dead code"
  convention. `tabState[tab].targetName` (the underlying persisted state field) was left
  alone — it's harmless now-permanently-`undefined` state, and removing it would ripple into
  the broader `TabState`/persisted-settings shape, which is out of scope here.

## Prior Session Progress (for reference)

- **Fixed `conjugateChartParity.test.ts`'s test-harness bug**: its `beforeAll` was calling
  `buildSessionStats(pairs, ...)` with the raw, unfiltered pair list instead of
  max-effort-only rows. Changed it to build `allSigmaPairs` (max-effort rows from
  `tabRows.squat/bench/deadlift.maxEffort`), exactly mirroring `totalChartParity.test.ts`'s
  existing correct pattern.
- **Verified the fix resolved the divergence**: real `normalized`-composite maxRelDiff
  numbers came back as squat 0.0% / bench 0.7% / deadlift 0.4% — an exact match with
  `totalChartParity.test.ts`'s own documented residual baseline. This confirmed the
  previous session's alarming 31.4%/21.5%/25.4% numbers were purely a test-harness artifact.
- **Flagged, but did not decide, the gate-status question**: per `APP_COMPONENTS.md`'s
  literal "exact match, not soft-warn" gate wording, bench/deadlift were still technically
  non-zero, so whether to treat this as "gate met" (matching `TotalChart`'s precedent) or
  "still open" was left as an explicit maintainer decision — resolved this session (see
  above) by direct user instruction to proceed.
- Committed as `a102a4d` ("Fix conjugateChartParity test-harness fit-input bug (issue #459)").

## Prior-Prior Session Progress (for reference)

- Root-caused issue #459's stale parity numbers via bisection + production data-flow
  tracing; found and reverted a false-premise fix attempt on `packages/pipeline/src/pipeline.ts`'s
  `fitInput` filter (that filter is correct as-is, matches production legacy behavior — do
  not revert it). See git history (`b1b6a65`) for full detail if needed.

## Open TODOs

1. **Re-evaluate `VariationRadarChart` (issue #460, `MIGRATION_PLAN.md` item #1)** now that
   `ConjugateCharts` has landed with its residual explicitly accepted: does the same
   explicit-acceptance approach unblock this swap too, rather than waiting on a hard-assert
   exact match? This is the natural next migration step, but is a policy question (same shape
   as last session's gate-status question) worth a quick confirmation before implementing,
   not a purely mechanical next-step.
2. **`LiftTabPanel.md` (`MIGRATION_PLAN.md` item #2)** — composition-root swap, blocked on
   #1 above landing first.
3. Consider whether `TabState.targetName` (the persisted-settings field that used to be set
   by `ConjugateCharts`' now-removed dropdown) should be removed from the `TabState` type
   entirely, or left as permanently-unused-but-harmless state — not resolved this session,
   flagged as a minor cleanup opportunity only.
4. `migration/ValidatorPage.md` — still blocked on an unrelated scope decision, not
   sequencing; unchanged from prior sessions.

## Files Touched (this session)

- `packages/pipeline/src/pipeline.ts` — `PipelineModel` now exposes `tagged`.
- `packages/pipeline/src/index.ts` — exports `isSpeedWork`.
- `packages/app/src/pipeline/conjugateBestSet.ts` (new) + `conjugateBestSet.test.ts` (new).
- `packages/app/src/hooks/pipeline/usePipelineConjugateChartData.ts` (new).
- `packages/app/src/hooks/conjugate/useConjugateChartData.ts` (deleted).
- `packages/app/src/hooks/conjugate/index.ts`, `CLAUDE.md` — barrel/doc updates for the
  deletion above.
- `packages/app/src/hooks/pipeline/CLAUDE.md` — new hook entry.
- `packages/app/src/components/conjugate/ConjugateCharts.tsx` — swapped onto pipeline,
  dropdown removed.
- `packages/app/src/components/conjugate/ConjugateCharts.module.css` — removed now-unused
  `.targetRow`/`.targetSelect` rules.
- `packages/app/src/components/conjugate/CLAUDE.md` — doc update.
- `packages/app/src/components/pages/LiftTabPanel.tsx`, `packages/app/src/App.tsx` — new
  props wiring, `onTargetChange` removed.
- `MIGRATION_PLAN.md`, `APP_COMPONENTS.md`, `TASK_LIST.md`, `migration/ConjugateCharts.md` —
  docs updated to reflect the swap as done.
- `HANDOFF.md` — this update.

## Suggested Next Skills

- No specific skill — next session should start by confirming Open TODO #1 (whether
  `VariationRadarChart`'s residual divergence can be explicitly accepted the same way
  `ConjugateCharts`' was), then proceed with that swap and `LiftTabPanel` composition-root
  wiring if so.
