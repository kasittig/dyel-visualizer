# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Tasks 13 (`DiagnosticsPanel`, #461),
14 (`ConjugateCharts`, #459), `VariationRadarChart` (#460), and **now `LiftTabPanel`
(`MIGRATION_PLAN.md` item #2, this session)** are all complete. **Phase 1 of the migration
plan is now fully complete** — the only remaining item in `MIGRATION_PLAN.md`/
`APP_COMPONENTS.md` is the off-to-the-side, scope-blocked `ValidatorPage` question.

## Progress Overview (this session)

Picked up from last session's Open TODO #1: re-scope `migration/LiftTabPanel.md` (flagged
stale) and, once re-scoped, implement `LiftTabPanel`'s swap.

Re-scoping (done directly, not delegated — this was investigation/planning, not
implementation) confirmed the prior session's suspicion was correct and the actual remaining
work was much smaller than the original plan assumed:

- `LiftTabPanel.tsx`'s `filterByDateRange` usage and other runtime `@dyel/core` dependencies
  were already removed as dead code during last session's `VariationRadarChart` swap. The
  only two things left in the file were type-only imports: `DeadliftStancePreference` and
  `LiftType`.
- Confirmed `@dyel/pipeline` already exports `AthleteContext` with a `deadliftStance: 'sumo' |
'conventional'` field (`derive/athlete.ts`), so the `HANDOFF.md` Part A prerequisite this
  doc referenced was indeed already satisfied, as `MIGRATION_PLAN.md` claimed.
- Confirmed via direct file reads that `LiftTabPanel`'s own children — `ConjugateCharts.tsx`
  and `VariationRadarChart.tsx` — already type their `liftType` prop as plain `string`, not
  `@dyel/core`'s `LiftType`, establishing a clear precedent to follow rather than importing a
  pipeline-native `LiftType` equivalent (which isn't even exported from `@dyel/pipeline`'s
  top-level barrel — only from an internal `tag/detect/conjugate-types.ts` module).
- Confirmed via direct file read that `DiagnosticsPanel.tsx` — already listed as a **fully
  migrated/complete** component in `APP_COMPONENTS.md` — retains this exact same type-only
  `DeadliftStancePreference` import from `@dyel/core`, unchanged. This is decisive precedent:
  a type-only `@dyel/core` import for this type doesn't block "migrated" status in this
  repo's established convention, so `LiftTabPanel` didn't need a new pipeline-native type
  invented for it.
- Concluded no `liftTabPanelParity.test.ts` (the original plan's step 4) was needed:
  `LiftTabPanel.tsx` does pure composition/prop-passing (threading props to
  `ConjugateCharts`/`VariationRadarChart`/`DiagnosticsPanel`, managing shared
  `selectedVariation` highlight state) with zero data transformation, so there's no
  legacy-vs-pipeline divergence to regression-test.

Delegated implementation across three sequential/parallel subagent tasks (each verified
independently, not trusting subagent-reported summaries blind):

1. **`feature-implementer`**: widened `LiftTabPanel.tsx`'s `liftType` prop from `LiftType` to
   `string`, removed the now-unused `LiftType` import, left `DeadliftStancePreference`
   untouched. Verified directly via `Read` after the agent reported completion — diff matched
   spec exactly, no extraneous changes.
2. **`qa-reviewer`** (parallel with #3): re-ran `npm run build -w packages/pipeline && npm run
build -w packages/core && npm run build -w packages/app` (all clean) and `npm test -w
packages/app` — **26 files / 254 tests passed**, identical count to last session (expected,
   since no test files changed). `grep -rn "@dyel/core" packages/app/src/components/pages/
LiftTabPanel.tsx` confirmed exactly one remaining match: the intentional
   `DeadliftStancePreference` type-only import.
3. **`feature-implementer`** (parallel with #2): updated `migration/LiftTabPanel.md` (new
   "LiftTabPanel swap-over (2026-07-09)" section, following the same section-style precedent
   as `ConjugateCharts.md`/`VariationRadarChart.md` — not deleted), `MIGRATION_PLAN.md` (item
   #2 struck through/marked complete, top summary updated to note Phase 1 is fully complete),
   and `APP_COMPONENTS.md` (`LiftTabPanel` added to the fully-migrated list, stale
   "not yet migrated" paragraph removed, new Status-section paragraph added). Reviewed the
   actual `git diff` of all three files directly (not just the subagent's summary) — clean,
   accurate, consistent with established doc conventions and the actual code change; accepted
   as-is with no corrections needed.

**Full verification, independently re-run**: build clean across `pipeline`/`core`/`app`;
`npm test -w packages/app` 26/26 files, 254/254 tests passing, zero regressions. `grep -rn
"@dyel/core"` on `LiftTabPanel.tsx` returns only the one intentional type-only import.

## Decisions Made & Rationale (this session)

- **Did not invent a pipeline-native replacement type for `DeadliftStancePreference`.**
  `@dyel/pipeline` has `AthleteContext['deadliftStance']` but no standalone exported type
  matching `DeadliftStancePreference`'s shape. Rather than adding a new pattern (e.g. a type
  alias derived from `AthleteContext`), followed the already-decided, already-shipped
  precedent from `DiagnosticsPanel.tsx` (a component this repo's own docs already call
  "fully migrated" despite this exact same import). Consistency with existing convention over
  a fresh judgment call.
- **Did not write a `liftTabPanelParity.test.ts`.** The original `migration/LiftTabPanel.md`
  plan (written before `VariationRadarChart`'s dead-code removal) assumed this component still
  did date-range filtering worth regression-testing. It no longer does. Writing a parity test
  for a component with no data transformation would test nothing meaningful.
- **Kept `migration/LiftTabPanel.md` rather than deleting it**, matching the
  `ConjugateCharts.md`/`VariationRadarChart.md` precedent (append a "swap-over" section) over
  the `RepCalculator.md`/`StrengthScoreCalculator.md`/`DiagnosticsPanel` precedent (delete the
  doc). This file had substantive pre-existing context (dependency sequencing, the
  `deadliftStance`/`AthleteContext` prerequisite) worth retaining as history, unlike the
  deleted docs.

## Open TODOs

1. **`migration/ValidatorPage.md`** — still blocked on an unrelated scope decision
   ("is this even in scope for migration?"), unchanged from prior sessions. Only remaining
   item in the entire migration plan.
2. Consider whether `TabState` (flagged two sessions ago as now-emptied of both fields) should
   be removed entirely. Not resolved this session; still flagged only, not touched.

## Prior Session Progress (for reference — VariationRadarChart swap, closes #460)

- Implemented the `VariationRadarChart` swap onto `@dyel/pipeline`; deprecated its
  cross-exercise per-target normalization following the `ConjugateCharts` precedent, but
  promoted the raw-snapshot parity test to a hard assert (genuine 0.0% divergence, not a
  soft-warn exception) — see commit `896f40c` and `migration/VariationRadarChart.md`.
- Removed dead `TabState.targetName`/`baselineName` and the entire unused `tabState`
  App.tsx state/localStorage mechanism (see commit `0f6da6f`).

## Prior-Prior Session Progress (for reference — ConjugateCharts swap, closes #459)

- Implemented the real `ConjugateCharts` swap onto `@dyel/pipeline`; deprecated the
  "Competition variation" dropdown entirely (no pipeline-native equivalent existed for its
  per-target normalization) — the direct precedent both `VariationRadarChart` and (for its
  type-only import handling) `LiftTabPanel` followed.
- Extended `@dyel/pipeline`: `PipelineModel.tagged`, exported `isSpeedWork`.
- Residual (bench 0.7%/deadlift 0.4%) explicitly accepted, matching `TotalChart`'s own
  baseline — still soft-warned, still in production.

## Files Touched (this session)

- `packages/app/src/components/pages/LiftTabPanel.tsx` — widened `liftType` prop from
  `@dyel/core`'s `LiftType` to plain `string`; removed the now-unused `LiftType` import; kept
  `DeadliftStancePreference` type-only import unchanged.
- `migration/LiftTabPanel.md` — added "LiftTabPanel swap-over (2026-07-09)" section.
- `MIGRATION_PLAN.md` — item #2 marked complete; top summary updated to note Phase 1 is fully
  complete.
- `APP_COMPONENTS.md` — added `LiftTabPanel` to the fully-migrated list; removed the stale
  "not yet migrated" paragraph; added a Status-section paragraph.
- `HANDOFF.md` — this update.

## Suggested Next Skills

- No specific skill — the migration plan (Phase 1) is fully complete. Next session should
  either raise the `ValidatorPage` scope question (Open TODO #1) if the maintainer wants to
  resolve it, or pick up unrelated feature/bug work — there is no remaining sequenced
  migration work.
