# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Full per-component gap inventory
lives in `GAPS_REMAINING.md` (still current, not superseded). Historical root-cause
detail for the fit-window/volume-filtering investigation lives in `LEGACY_MIGRATION.md`
and `VOLUME_FILTER_DESIGN.md` — both still current, referenced below rather than
re-summarized.

## Progress Overview

- **Closed the squat/bench/deadlift/total `maxRelDiff` parity gap** (was 16-25%,
  tracked in `totalChartParity.test.ts`/`sigmaTabParity.test.ts`). Root cause: legacy's
  `splitByEffort` excludes volume/speed-work sessions from the normalization-model fit;
  `@dyel/pipeline`'s `fitNormalizationModel` had no equivalent. Fixed via
  `VOLUME_FILTER_DESIGN.md`'s "Option D": added typed `SetRecord.sets`, CSV parser
  support (with legacy's default-to-1 fallback), and a pre-fit filter in
  `pipeline.ts` (`sets === undefined || sets === 1 || rpe !== undefined` — the
  `undefined` branch matters, it's what keeps freeform-sourced data, which has no
  `sets` concept, from being wrongly excluded). CSV-only scope; freeform
  `<sets>x<reps>` grammar deliberately not built (no fixture to justify it).
  **Result:** squat 18.1%→0.0%, bench 21.5%→0.7%, deadlift 25.4%→0.4%, total
  16.9%→0.0%. Full monorepo suite green (650/650 tests, 3/3 builds).
- **Updated `GAPS_REMAINING.md` §0c-0e and `packages/app/CLAUDE.md`'s divergence
  numbers** to reflect the above — both were stale/incorrect (previously attributed
  the gap to a fit-window mismatch, which was investigated and disproven).
- **Cleaned up stale git worktrees**: removed `parity-test`/`rep-max-csv-format`
  (verified clean, zero commits ahead of `main` first) and 5 orphaned/empty
  directories under `.claude/worktrees/`. Confirmed the git status is real (these
  were tracked gitlink/submodule entries per commit `5687a1a`, not just filesystem
  clutter).

## Decisions Made & Rationale

- **Option D over A/B/C** (see `VOLUME_FILTER_DESIGN.md` for all four): land the
  small CSV-only fix first and measure before investing in the freeform grammar
  (Option A) or accepting the gap permanently (Option C). It fully closed the gap,
  so the freeform work was never needed — validates the sequencing choice.
- **Did not build freeform `sets` support.** No fixture currently has
  freeform-sourced volume/speed-work data to demonstrate a real residual, so this is
  documented as a known, unquantified, low-priority gap rather than built
  speculatively.
- **Did not delete `.claude/worktrees/agent-a521f01946ae87249`.** Unlike the other
  two removed worktrees, it has real uncommitted changes (modified
  `RepCalculator.tsx` + 3 untracked new files) that look like abandoned in-progress
  work toward `GAPS_REMAINING.md` §2's `RepCalculator` swap. No commits exist to
  recover from if deleted, so left in place pending an explicit user decision.
- **Restored `LEGACY_MIGRATION.md`** after finding it staged for deletion mid-session
  (cause unknown — no intentional action by me or the user deleted it; likely
  incidental fallout from an agent's shell command). Multiple docs reference it by
  name as the historical investigation record, so it was restored from `HEAD` rather
  than left deleted.

## Open TODOs

1. **Decide on `.claude/worktrees/agent-a521f01946ae87249`** — inspect and salvage
   the uncommitted `RepCalculator.tsx`/`usePipelineRepCalculator.ts`/
   `repCalculatorUtils.ts`/`repCalculatorStats.ts` changes (possibly shortcuts
   `GAPS_REMAINING.md` §2 Task 2b), or confirm it's throwaway and safe to delete.
2. **`GAPS_REMAINING.md`** — everything outside the now-closed §0 is untouched and
   current: §5 `DiagnosticsPanel` (largest remaining item, 3 design sign-offs
   needed), §3/§4 `ConjugateCharts`/`VariationRadarChart` swap-overs (worth
   re-reading now that §0 is fully clean, not just `MIN_SAMPLES`-clean), §2
   `RepCalculator`/`StrengthScoreCalculator`, §6 `LiftTabPanel`, §7 `ValidatorPage`
   scope question, §1 `TotalChart` type-only cleanup. See that file for full detail.
3. File a GitHub tracking issue for the (already-closed) volume/speed-work
   filtering gap, for the record — low priority, fix already landed.
4. **RPE range-validation gap** (found, not fixed): pipeline's CSV parser doesn't
   range-check RPE (`[1,10]`) the way legacy does
   (`packages/core/src/transform/parsers/parseSessionFields.ts:16-18`). No fixture
   demonstrates a concrete failure; documented in `VOLUME_FILTER_DESIGN.md`, no
   action taken.

## Files Touched

- `packages/pipeline/src/types.ts` — added `SetRecord.sets?: number`
- `packages/pipeline/src/parse/csv.ts` — populate `sets` with legacy's
  default-to-1 fallback
- `packages/pipeline/src/pipeline.ts` — pre-fit filter (`fitInput`) before
  `fitNormalizationModel`
- `GAPS_REMAINING.md` — §0c-0e corrected/resolved, summary re-ordered
- `packages/app/CLAUDE.md` — divergence numbers re-baselined
- `VOLUME_FILTER_DESIGN.md` — new, design options + Option D rationale (historical
  record, not restated elsewhere)
- `HANDOFF.md` — this file
- Removed (not modified): `.claude/worktrees/{parity-test,rep-max-csv-format}` +
  branches, and 5 empty orphaned directories under `.claude/worktrees/`

## Suggested Next Skills

- Resolve Open TODO #1 (the abandoned worktree) before anything else touches
  `RepCalculator.tsx` — don't duplicate work that may already be sitting there.
- Then pick up `GAPS_REMAINING.md` in its stated priority order (§5
  `DiagnosticsPanel` first, per that file's own summary).
