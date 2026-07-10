# API Phase 4: Documentation cleanup

## Status: NOT STARTED (blocked by `API_PHASE_3.md`)

## Background

Final phase implementing the `@dyel/api`-as-sole-boundary decision (see
`API_PHASE_1.md` for full context). Only doc updates happen here — no source changes.
**Do not start this phase until `API_PHASE_3.md`'s verification (Task 32 + full
regression gate + `qa-reviewer` sign-off) has passed.** Don't write "done" docs before
the migration is actually confirmed done.

## Task list

Tasks 33-35 have no dependencies on each other and can run in parallel, but all must
wait on Phase 3's sign-off.

- [ ] Task 33: Update `packages/app/CLAUDE.md`'s MVC mapping section to reflect the
      new reality: Controller = `hooks/pipeline/*` (now thin, api-delegating) + the
      two remaining legitimate `@dyel/pipeline`-touching files (`App.tsx`,
      `usePipelineValidation.ts`); update the "Key modules" table entry for
      `RepCalculator.tsx` (now render-only, describe `usePipelineRepCalculator` as
      owning the logic) and remove stale references to `src/pipeline/*.ts` (that
      directory is deleted per Phase 2 Task 30); update `hooks/pipeline/CLAUDE.md` and
      `components/shared/CLAUDE.md` per-file tables for the same reason (Target:
      `packages/app/CLAUDE.md`, `packages/app/src/hooks/pipeline/CLAUDE.md`,
      `packages/app/src/components/shared/CLAUDE.md`, Test: none — doc-only, verify
      by reading)
- [ ] Task 34: Delete `migration/PipelineApiBoundary.md` per the repo's "delete once
      100% done" `migration/` convention (already demonstrated with
      `CoreDeprecation.md`) — this migration is what resolved it (Target:
      `migration/PipelineApiBoundary.md` (deleted), Test: none — doc-only)
- [ ] Task 35: Update `HANDOFF.md` — mark the "Next up" section's
      `PipelineApiBoundary.md` item complete, record the final verification numbers
      (test counts before/after, from Phase 3's `qa-reviewer` pass), and add two new
      small "Next up" items: - The deferred `LiftType` dedupe: `@dyel/api` independently defines a `LiftType`
      literal type rather than re-exporting `@dyel/pipeline`'s structurally
      identical one (flagged in `API_PHASE_2.md` Task 15) — reconciling this is a
      separate, smaller cleanup outside this migration's scope, since a silent type
      dedupe risks import-order/circularity surprises better handled as its own
      reviewable diff. - An ESLint `no-restricted-imports` rule scoped to `packages/app/src` banning
      `@dyel/pipeline` imports (with an allowlist for `App.tsx` and
      `usePipelineValidation.ts`), to make the "sole boundary" rule self-enforcing
      going forward instead of relying on a manual grep (as this migration's Phase 3
      had to).
      (Target: `HANDOFF.md`, Test: none — doc-only)

## Once this phase is complete

The `@dyel/api`-as-sole-boundary migration (`API_PHASE_1.md` through `API_PHASE_4.md`)
is done. Per the repo's convention, these four docs can themselves be deleted from
`migration/` once their content is 100% reflected in reality and in `HANDOFF.md` — but
leave that decision to a follow-up pass, not this task, since deleting them
immediately after writing them removes the audit trail of what was done and why.
