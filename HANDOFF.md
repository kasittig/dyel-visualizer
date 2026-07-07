# HANDOFF — migration-phase-1 rebase onto main + doc reconciliation

## Context

`migration-phase-1` is a feature branch (PR #456) implementing Phase 1 of
`MIGRATION_PLAN.md`: building pipeline-native replacements and core-vs-pipeline
parity tests for app components, without switching the components over to
`@dyel/pipeline` yet (that swap-over is intentionally deferred). Separately,
`main` had already gone through a full revert of `ConjugateCharts` from
`@dyel/pipeline` back to `@dyel/core` (commit `46f267f`) after a parity test
surfaced real divergence between the two implementations. This session's goal
was to rebase `migration-phase-1` onto the now-updated `main` and reconcile
any resulting conflicts/doc drift.

## Progress Overview

- Rebased `migration-phase-1` (was `9b1fd3e`) onto `main` (`aee213e`); final
  branch head is `14b0ccf`. Branch was already force-pushed to
  `origin/migration-phase-1` by the user.
- Two conflicts during rebase, both centered on `ConjugateCharts`:
  `packages/app/src/components/conjugate/ConjugateCharts.tsx` and
  `packages/app/src/pipeline/conjugateChartParity.test.ts`. Resolved by
  keeping `main`'s version verbatim (confirmed via `git diff main` showing no
  difference on either file) — i.e., `migration-phase-1` no longer re-migrates
  `ConjugateCharts` to `@dyel/pipeline`; it stays on `@dyel/core` per the
  earlier revert.
- QA ran full build + test suite post-rebase: `packages/pipeline` and
  `packages/core` build clean; 668 tests pass across all three packages (188
  pipeline, 321 core, 159 app), no regressions.
- Updated PR #456's description (via `gh api ... --method PATCH`, per the
  known `gh pr edit --body` breakage on this repo) to remove the now-false
  claim that `ConjugateCharts` was migrated, and to reflect current test
  counts.
- Updated two docs that had drifted out of sync with the code after the
  rebase resolution:
  - `APP_COMPONENTS.md` — moved `ConjugateCharts` from "Already migrated" to
    "Ready to migrate," explained it still calls `useConjugateChartData` →
    `@dyel/core`'s `buildVariationChartData`, and flagged that any future
    re-migration attempt must first resolve the divergence documented in
    `HANDOFF.md` Session 6 (this file, historically) before swapping back.
  - `migration/ConjugateCharts.md` — rewritten from a forward-looking "add a
    parity test" plan (stale) to a description of the parity test that
    already exists, why `conjugateChartSpecs.ts` is kept around with no
    runtime importer (solely to back the parity test), and an explicit
    warning against re-attempting the ConjugateCharts pipeline migration
    without resolving the prior divergence.

## Decisions Made & Rationale

- **Kept `main`'s ConjugateCharts revert during the rebase** (user's explicit
  choice) rather than re-applying `migration-phase-1`'s pipeline
  re-migration — avoids silently re-introducing a bug that a prior session
  deliberately reverted after parity-test-surfaced divergence.
- **Used `gh api ... PATCH` instead of `gh pr edit --body`** to update PR
  #456 — `gh pr edit --body` silently no-ops on this repo due to a Projects
  (classic) GraphQL deprecation issue (known, documented workaround).
- **Docs now explicitly gate any future ConjugateCharts re-migration** behind
  resolving the historical divergence, to prevent a future session from
  redoing the same mistake without realizing prior context.

## Open TODOs

- None blocking. Optional follow-ups if picked back up later:
  - If someone wants to re-attempt migrating `ConjugateCharts` to
    `@dyel/pipeline`, first read the divergence root-cause writeup previously
    tracked under "Session 6" in this file's history (variation-label-space
    mismatch, normalization-fitting divergence) before starting.
  - The three other "ready to migrate" components (`DiagnosticsPanel`,
    `RepCalculator`, `StrengthScoreCalculator`) still have their actual
    component swap-overs deferred — pipeline-native replacements + parity
    tests are ready and passing; swapping is described as small/low-risk in
    `APP_COMPONENTS.md`.
  - `.claude/skills/handoff/SKILL.md` has an unrelated uncommitted change in
    the working tree (unrelated to this session's work) — not touched or
    committed here.

## Files Touched

- `APP_COMPONENTS.md` (doc update)
- `migration/ConjugateCharts.md` (doc update)
- `handoff.md` (this file)
- (Remote only, no local diff) PR #456 description on GitHub

## Suggested Next Skills

- None required immediately. If resuming pipeline migration work, start by
  reading `MIGRATION_PLAN.md` and `APP_COMPONENTS.md`'s "Ready to migrate"
  section for the next candidate component swap-over.
