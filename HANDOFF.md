# HANDOFF — Finding #6 fixed (addlWtOffset wired into pipeline normalization, Design B)

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` components off `@dyel/core` onto `@dyel/pipeline`. `ConjugateCharts` is
Phase 4's first blocker: migrated to `@dyel/pipeline` once, then deliberately reverted
(`46f267f`) after `conjugateChartParity.test.ts` found real legacy-vs-pipeline
normalization divergence. Full task tracking lives in `SPECIFICATIONS.md`'s "ConjugateCharts
normalization divergence" section; full root-cause/outcome detail lives in
`migration/ConjugateCharts.md`.

This session picked up Open TODO #1 from the prior handoff: get sign-off on and implement a
fix for Finding #6 (the `normalized` composite's real value divergence — squat exact,
bench 9.8%, deadlift 5.1% `maxRelDiff`, root-caused in the previous session as
`packages/pipeline/src/derive/normalize.ts` computing `addlWtOffset` but never consuming it).

## Progress Overview

- **Got explicit user sign-off on Design B** (full two-sided mirror of legacy's correction,
  not the narrower fit-only Design A) after presenting both options with concrete tradeoffs.
- **Implemented and shipped the fix** in `packages/pipeline/src/derive/normalize.ts`
  (delegated to `feature-implementer`, independently re-verified via `qa-reviewer` and by
  team-lead directly):
  - **Fit-time**: `fitNormalizationModel` now fits `addlWtOffset` first for addlWt-tagged
    canonicals, then offset-adjusts that canonical's records (`weight += offsetKg`, via
    immutable copies) before fitting `variantFactor` — mirrors `sessionIndex.ts`'s
    `applyAddlWtOffset`-before-`fitVariantFactor` sequencing exactly. Non-addlWt canonicals
    unaffected.
  - **Apply-time**: discovered mid-implementation that no signature change was needed.
    Legacy's `repCalculator.ts` `findBestE1RM` already applies `addlWtOffset` in
    **e1RM-space** (not weight-space) at the same aggregated per-canonical level pipeline's
    `Point`/`NormalizationModel` operate at — a documented legacy approximation ("valid
    because offset and e1RM share the same weight unit"). So `normalizeE1rm` now adds
    `offsetKg` before dividing by `factor`; `projectToVariant` subtracts `offsetKg` after
    multiplying by `factor` (clamped to 0) — exact mirror of `findBestE1RM`, zero API break.
  - Added 8 new tests to `normalize.test.ts` (fit-time offset-adjustment proof, apply-time
    add/subtract values, clamping, round-trip inverse correctness, non-addlWt regression
    coverage); updated one stale factor expectation that changed under the new fit logic.
- **Real numbers** (`conjugateChartParity`, independently re-verified):
  squat 0.0% (unchanged), bench 9.8%→**7.0%**, deadlift 5.1%→**0.4%**. Narrowed
  substantially, not fully closed — expected, since Design B mirrors legacy's own
  documented e1RM-space _approximation_, not an exact correction; residual divergence is
  inherent to that shared approximation, not a new bug.
- **Checked `TotalChart` too, per explicit user request** (closing Open TODO #5 from the
  prior handoff) — and caught a wrong claim along the way. The first `qa-reviewer` pass
  claimed "TotalChart's fixture has zero addlWt canonicals" (implying the fix doesn't touch
  it); team-lead did not trust this and verified directly: grepped the shared fixture for
  chain/band bench entries (found several), then did a `git stash`/rebuild/test/restore
  bisection of the fix itself. Confirmed TotalChart's bench/deadlift numbers were
  **previously identical** to ConjugateCharts' pre-fix numbers (9.8%/5.1% — same shared
  fixture, unfiltered `lift:*` composite queries) and improved the same way post-fix
  (bench 7.0%, deadlift 2.7%, total 1.8%). TotalChart benefited automatically from the
  shared pipeline-level fix, zero TotalChart-specific code needed — confirms the fix was
  correctly scoped.
- **No regressions**: full suite green — `npm run build -w packages/pipeline`,
  `npm run build -w packages/app` both clean; `npm test -w packages/pipeline` 12 files/203
  tests (up from 195); `npm test -w packages/app` 19 files/200 tests (unchanged).
- **Did NOT** attempt the `ConjugateCharts.tsx`/`useConjugateChartData.ts` component swap
  onto `@dyel/pipeline` — out of scope for Task 10 (fix-only), still on `@dyel/core` at
  runtime.

## Decisions Made & Rationale

- **Chose Design B over Design A** (per user instruction) — full two-sided correction
  rather than fit-time-only, since fit-only would still leave apply-time skewed for addlWt
  canonicals.
- **Kept `normalizeE1rm`/`projectToVariant`'s signatures unchanged** — a design refinement
  discovered while implementing Design B, not the original plan. The original proposal
  assumed a weight-space mirror (matching legacy's `normalizeToBaseE1RM`) would require
  passing raw weight/reps into these functions, a breaking API change. Deeper code reading
  found legacy's `findBestE1RM` already does the correction in e1RM-space at the same
  aggregation level pipeline operates at, so mirroring _that_ function instead avoided the
  API break while still being a faithful (if approximate, matching legacy's own documented
  approximation) port.
- **Did not accept the QA subagent's TotalChart claim at face value** — verified directly
  via fixture grep + a stash-bisection rather than propagate an unconfirmed claim into docs,
  consistent with this project's established convention (see `feedback_prefer_reusable_test_harnesses`-style
  precedent throughout this migration) of not trusting plausible-sounding narratives without
  direct evidence.

## Open TODOs

1. **Actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto `@dyel/pipeline`.**
   Finding #6 (the last known blocker) is now fixed, not just root-caused — this was the
   explicit gate from every prior session's "Before re-attempting" note in
   `migration/ConjugateCharts.md`. This is the natural next step for Phase 4. Note residual
   divergence (bench 7.0%, deadlift 0.4%) is expected/accepted, not a new blocker — same
   soft-warn, not-hard-asserted treatment as established throughout this migration.
2. Once ConjugateCharts is actually swapped (or deferred further), `MIGRATION_PLAN.md`
   Phase 4's other two blockers (`VariationRadarChart`, `DiagnosticsPanel`) still need the
   same real pipeline-side-work treatment before `LiftTabPanel.md` can proceed.
3. **Uncommitted changes are sitting in the working tree** (not committed this session,
   per instructions to only commit when explicitly asked): `SPECIFICATIONS.md`,
   `migration/ConjugateCharts.md`, `packages/pipeline/src/derive/normalize.ts`,
   `packages/pipeline/src/derive/normalize.test.ts`. This handoff process will commit them
   (see below) — confirm they landed if picking this up fresh.
4. `.claude/skills/handoff/SKILL.md` still shows as modified in `git status` in some prior
   sessions (uncommitted, pre-existing, unrelated) — not touched or investigated this
   session either, same as every prior handoff. Worth a dedicated look eventually.

## Files Touched

- `packages/pipeline/src/derive/normalize.ts` (Design B fit-time + apply-time addlWtOffset
  wiring)
- `packages/pipeline/src/derive/normalize.test.ts` (8 new tests + 1 updated expectation)
- `migration/ConjugateCharts.md` (new "Finding #6 fixed" section: implementation summary,
  real before/after numbers, TotalChart cross-check writeup including the corrected QA
  claim)
- `SPECIFICATIONS.md` (Task 10a–10g all checked off, Status section updated)
- `HANDOFF.md` (this file)

## Suggested Next Skills

- None required immediately. If resuming this work, start with Open TODO #1 (the actual
  `ConjugateCharts.tsx`/`useConjugateChartData.ts` component swap-over) — Finding #6 being
  fixed removes the last documented blocker for it, per `migration/ConjugateCharts.md`'s
  "Before re-attempting" note.
