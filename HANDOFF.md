# HANDOFF — Phase 2 of MIGRATION_PLAN.md (SigmaTab + VariationRadarChart)

## Context

`migration-phase-1` is a feature branch (PR #456) implementing `MIGRATION_PLAN.md`'s
pipeline-native migration of `packages/app` components off `@dyel/core` onto `@dyel/pipeline`.
Phase 1 (TotalChart, ConjugateCharts, DiagnosticsPanel, RepCalculator, StrengthScoreCalculator)
was already complete going into this session. This session executed Phase 2:
`migration/SigmaTab.md` and `migration/VariationRadarChart.md`. Full task tracking lives in
`SPECIFICATIONS.md` (the Phase 2 section, at the bottom of the file — the top section is an
older, unrelated, now-confirmed-complete `deadliftStance`/baseline-identity workstream; don't
confuse the two).

## Progress Overview

- **`SigmaTab.tsx` fully migrated** off `@dyel/core`'s `buildChartData` onto
  `usePipelineTotalChartData` (`runPipeline` + `TOTAL_CHART_SPECS`) — this hook already existed
  but was dead code (nothing called it) until this session. Added
  `mergeVolumeIntoChartPoints` (`packages/app/src/utils/pipelineChartUtils.ts`) to merge in the
  `volume`/accessory-volume series from the `volumeByDate` prop (computed independently in
  `App.tsx` via `calculateVolumeCorrelation`, no pipeline-side gap). `SigmaTab.tsx`'s props
  changed from `sigmaPairs`/`sigmaStats`/`effectiveBaselineNames`/`effectiveTargetNames` to
  `inputMode`/`url`/`pastedText`/`refreshToken`/`unit`/`volumeByDate` (`dateRange`/
  `onDateRangeChange` unchanged); `App.tsx`'s call site updated to match. Zero `@dyel/core`
  imports remain in `SigmaTab.tsx`.
- Added `packages/app/src/pipeline/sigmaTabParity.test.ts` (17 tests): hard-asserts
  squat/deadlift/pushPull/total sanity + exact `volume` match (both sides source it from the
  same `calculateVolumeCorrelation` call), soft-warns bench per the already-documented
  normalization divergence (see `totalChartParity.test.ts`'s comment block).
- Added `packages/app/src/pipeline/variationRadarChartParity.test.ts` (5 tests): validates the
  pipeline-native snapshot replacement for `VariationRadarChart` (via `conjugateChartSpecs()` +
  `testUtils/diffVariationSnapshot.ts`'s snapshot/diff functions) against legacy
  `normalizeToBaseE1RM`, per lift type. No divergence surfaced on the current fixture, but the
  test only soft-warns (never hard-asserts equality) — see Decisions below for why.
- Updated `MIGRATION_PLAN.md` (Phase 2 status section), `APP_COMPONENTS.md` (`SigmaTab` moved to
  "Already migrated"; `VariationRadarChart` added to "Ready to migrate" with explicit
  swap-deferral rationale), `migration/VariationRadarChart.md` (rewritten — step 2, the component
  swap, marked deferred rather than done).
- Full verification (re-run independently after a QA subagent's report on
  `packages/pipeline` looked wrong — see Decisions): `npm run build` clean for
  `packages/pipeline`/`packages/core`/`packages/app`; `npm test` all green —
  **pipeline 12 files/188 tests, core 22 files/321 tests, app 16 files/181 tests.** No
  regressions.

## Decisions Made & Rationale

- **`VariationRadarChart.tsx`'s actual component swap-over is intentionally NOT done**, even
  though its parity test passes cleanly. Two independent reasons, either sufficient alone: (1)
  its per-variation normalization is the same category of logic that `ConjugateCharts` was
  **reverted** away from after a prior parity test surfaced real divergence (`46f267f`) — a
  clean run on this fixture doesn't prove that divergence is reconciled, only that this fixture
  doesn't exercise it; (2) the pipeline snapshot only has last-value e1RM numbers, not the
  last-session tooltip detail (date/sets/reps/weight/RPE) the component currently renders, so
  this isn't a drop-in hook swap like the three Phase-1 deferred components. Both blockers are
  spelled out in `migration/VariationRadarChart.md` and `APP_COMPONENTS.md` so a future session
  doesn't attempt the swap without addressing them.
- **SigmaTab's `volume` series needed no pipeline change** — it was already sourced independently
  of `buildChartData` (via `calculateVolumeCorrelation` in `App.tsx`), so the migration is a pure
  merge-at-the-app-layer rather than a new `DatasetSpec`.
- **Re-verified `packages/pipeline`'s test count directly** rather than trusting a `qa-reviewer`
  subagent's report verbatim — it claimed "0 test files (passWithNoTests)" for
  `packages/pipeline`, which was wrong; a direct re-run showed 12 files/188 tests passing. Treat
  subagent QA reports as a first pass, not gospel, when a number looks suspicious (e.g. an
  unexpectedly-empty result for a package known to have tests).
- Discovered and fixed a stale checklist: the top section of `SPECIFICATIONS.md` (deadliftStance/
  baseline-identity work) was already fully implemented in code (verified directly — `athlete.ts`,
  `rawInputUtils.ts`, `pipeline.ts`, and `totalChartParity.test.ts`'s baseline-identity assertions
  all present and passing) but its checkboxes were never marked done. Marked complete rather than
  re-doing the work.

## Open TODOs

- None blocking for Phase 2 — it's fully closed out.
- Next per `MIGRATION_PLAN.md`: **Phase 3** — `migration/SessionBarChart.md` and
  `migration/SigmaChart.md` (do together, same underlying `ChartPoint`/`formatDate` cleanup from
  Phase 1's TotalChart work, reusing SigmaTab's now-pipeline-sourced fixtures), then
  `migration/DateLineChart.md` (wants Phase 1's TotalChart + this session's SigmaTab work already
  landed, which they are).
- Separately, unblocking the two deferred component swaps (`ConjugateCharts` re-migration,
  `VariationRadarChart` swap) requires root-causing the shared normalization-fitting divergence
  between legacy and pipeline (tracked partly via GitHub issue #451, partly via the soft-warn
  diagnostics already logged in `totalChartParity.test.ts`/`sigmaTabParity.test.ts`) — not part of
  Phase 3, but worth flagging as the actual blocker behind two "ready but deferred" items.
- `.claude/skills/handoff/SKILL.md` still shows as modified in `git status` (uncommitted, pre-existing,
  unrelated to this session's work) — not touched or investigated here, same as last handoff.

## Files Touched

- `packages/app/src/utils/pipelineChartUtils.ts` (new `mergeVolumeIntoChartPoints` helper)
- `packages/app/src/components/pages/SigmaTab.tsx` (migrated off `@dyel/core`)
- `packages/app/src/App.tsx` (updated `<SigmaTab>` call site props)
- `packages/app/src/pipeline/sigmaTabParity.test.ts` (new)
- `packages/app/src/pipeline/variationRadarChartParity.test.ts` (new)
- `MIGRATION_PLAN.md` (Phase 2 status section added)
- `APP_COMPONENTS.md` (inventory updated)
- `migration/VariationRadarChart.md` (rewritten — swap marked deferred)
- `SPECIFICATIONS.md` (Phase 2 checklist fully checked off; old Part A/B checklist retroactively
  marked complete)
- `HANDOFF.md` (this file)

## Suggested Next Skills

- None required immediately. If resuming migration work, start Phase 3 by reading
  `migration/SessionBarChart.md` and `migration/SigmaChart.md` together (they share the same
  underlying cleanup), then `migration/DateLineChart.md`.
