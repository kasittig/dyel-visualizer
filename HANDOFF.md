# HANDOFF: @dyel/core deprecation (migration-phase-1)

## Background

Full plan and history live in `migration/CoreDeprecation.md` — this file is just the
live status tracker for team-lead-coordinated execution. Goal: fully remove
`@dyel/core` from the workspace once `@dyel/pipeline`/`@dyel/api` cover its
functionality.

## Task list (this session)

- [x] Task 1: Export `LiftType` from `@dyel/pipeline` (Target:
      `packages/pipeline/src/index.ts`, Test: `npm run build -w packages/pipeline`)
- [x] Task 2: Delete the dead-code cluster in `packages/app` — `hooks/conjugate/`
      (whole dir), `hooks/data/useBaselineTargetExercises.ts`,
      `hooks/data/useLastSessionStats.ts`, `utils/appDataUtils.ts` (+ test),
      `distinctDisplayNames`/`ConjugateDataPair` out of `utils/appUtils.ts` (Target:
      see above, Test: `npm run build -w packages/app && npm test -w packages/app`) —
      blocked by Task 1
- [x] Task 3: Update stale `CLAUDE.md`/`CONVENTIONS.md` docs describing the deleted
      hooks/old data flow (Target: `packages/app/CLAUDE.md`,
      `packages/app/src/hooks/data/CLAUDE.md`, `packages/app/src/hooks/infra/CLAUDE.md`,
      `packages/app/src/components/charts/CONVENTIONS.md`, Test: grep verification, no
      build/test impact) — blocked by Task 2

## Status

**Tasks 1-3 DONE.** Final verification (independently re-run via qa-reviewer, not just
agent-reported):

- `npm run build -w packages/pipeline`: clean
- `npm run build -w packages/app`: clean
- `npm test -w packages/app`: 166/166 passing
- `npm test -w packages/pipeline`: 181/181 passing

`migration/CoreDeprecation.md`'s "Done" list and "Remaining" section renumbered to
reflect this. Changes are uncommitted on `migration-phase-1` as of this handoff —
not yet committed (only committing when the user explicitly asks, per repo convention).

## Next up (not started this session)

Per `migration/CoreDeprecation.md`'s remaining section:

1. **Migrate `@dyel/api`'s remaining `@dyel/core` dependencies** —
   `packages/api/src/text/parseTextData.ts`, `packages/api/src/filters/exerciseFilters.ts`,
   `packages/api/src/volume/volume.ts` need real `@dyel/pipeline`-native replacements
   (all three have live `App.tsx` production callers via `@dyel/api`).
   `packages/api/src/chart/buildChartData.ts` needs a grep-confirm — likely dead now
   that `totalChartParity.test.ts` is deleted, delete rather than migrate if so. This is
   real design work (no `@dyel/pipeline`-native replacement exists yet for these three
   call sites), not mechanical deletion like this session's Tasks 1-3 — needs its own
   scoping pass per file before delegating implementation.
2. **Final removal** — once `grep -rn "@dyel/core" -- ':!packages/core'` is empty:
   delete `packages/core/`, drop workspace/dependency entries, update root `CLAUDE.md`.

Explicitly deferred beyond that (do not start until `packages/core` is fully deleted):
reconciling `@dyel/api`'s "sole boundary" claim with the ~20 files in `packages/app`
that already import `@dyel/pipeline` directly — see `CoreDeprecation.md`'s "Deferred"
section for full detail.
