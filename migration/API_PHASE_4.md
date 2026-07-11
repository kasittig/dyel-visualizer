# API Phase 4: Documentation cleanup

## Status: DONE — all tasks (33-36) landed and independently verified

## Background

Final phase implementing the `@dyel/api`-as-sole-boundary decision (see
`API_PHASE_1.md` for full context). Only doc updates happen here — no source changes.
**Do not start this phase until `API_PHASE_3.md`'s verification (Task 32 + full
regression gate + `qa-reviewer` sign-off) has passed.** Don't write "done" docs before
the migration is actually confirmed done.

## Task list

Tasks 33-35 have no dependencies on each other and can run in parallel, but all must
wait on Phase 3's sign-off. Task 36 (formerly "Task 12b", deferred out of
`API_PHASE_1.md`) was added to this phase's task list once Phase 2's Tasks 19/20
landed, per that doc's instruction not to lose track of it.

- [x] Task 33: Update `packages/app/CLAUDE.md`'s MVC mapping section to reflect the
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
- [x] Task 34: Delete `migration/PipelineApiBoundary.md` per the repo's "delete once
      100% done" `migration/` convention (already demonstrated with
      `CoreDeprecation.md`) — this migration is what resolved it (Target:
      `migration/PipelineApiBoundary.md` (deleted), Test: none — doc-only)
- [x] Task 35: Update `HANDOFF.md` — mark the "Next up" section's
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
- [x] Task 36 (formerly "Task 12b", see `API_PHASE_1.md`'s "Deferred cleanup"
      section): delete `packages/pipeline`'s now-duplicated originals of
      `facetsFromTags`, `facetFamilyKey`, the `CONJUGATE_*` const arrays,
      `computeStrengthScores`, and `LINE_COLORS` — `packages/api` has owned its own
      copies since Phase 1, and Phase 2's Tasks 19/20 repointed the last direct
      `packages/app` consumers off pipeline's originals, so pipeline's copies are pure
      dead weight. Kept `classifyExerciseName` (documented pass-through exception) and
      the `Conjugate*` **types** (types-only sharing is the intended end state).
      Pre-delegation audit (before assigning this task) surfaced a real gap the
      original Task 12b description didn't cover: `packages/api/src/sheet/
    defaultExercise.ts` was importing `facetsFromTags` directly from
      `@dyel/pipeline` instead of `@dyel/api`'s own copy — fixed as the first step of
      this task, before any pipeline-side deletion, since deleting pipeline's copy
      first would have broken `packages/api`'s build. Also required deleting
      `athlete.ts`'s helpers/consts that were exclusive to `computeStrengthScores`
      (not shared with `wilks`/`dots`, which must keep working) and the matching
      pipeline-side test blocks in `tag.test.ts`/`athlete.test.ts` (deleted code with
      no corresponding test cleanup would have failed to compile). (Target:
      `packages/pipeline/src/tag/tag.ts`, `packages/pipeline/src/tag/tag.test.ts`,
      `packages/pipeline/src/tag/detect/conjugate-types.ts`,
      `packages/pipeline/src/derive/athlete.ts`,
      `packages/pipeline/src/derive/athlete.test.ts`,
      `packages/pipeline/src/utils/colors.ts` (deleted),
      `packages/pipeline/src/index.ts`, `packages/pipeline/src/tag/CLAUDE.md`,
      `packages/api/src/sheet/defaultExercise.ts`, Test: `npm run build -w
    packages/pipeline && npm test -w packages/pipeline && npm run build -w
    packages/api && npm test -w packages/api && npm run build -w packages/app &&
    npm test -w packages/app`)

      **DONE, independently re-verified** (not just the implementing agent's
      self-report): `packages/pipeline` build clean, tests **181 → 157** (24 tests
      removed — matches the 2 deleted `tag.test.ts` describe blocks +
      1 deleted `athlete.test.ts` describe block); `packages/api` build clean, tests
      **125/125 unchanged**; `packages/app` build clean, tests **133/133 unchanged**.
      Grep sweep (`grep -rn "facetsFromTags\|facetFamilyKey\|CONJUGATE_BARS\|
      CONJUGATE_STANCES\|CONJUGATE_EQUIPMENT\|CONJUGATE_ADDL_WTS\|
      computeStrengthScores\|LINE_COLORS" packages/pipeline/src`) confirms zero
      remaining references except one harmless doc-comment mention of
      `facetsFromTags` by name in `canonical.ts` (not a real import/usage). Full
      `git diff` reviewed directly (not just trusted): `index.ts`'s export list is a
      clean surgical removal, `LiftMetrics` type export removal confirmed safe since
      `packages/api`'s `strengthScores.ts` independently defines its own
      `LiftMetrics` interface rather than importing pipeline's.

## Once this phase is complete

The `@dyel/api`-as-sole-boundary migration (`API_PHASE_1.md` through `API_PHASE_4.md`)
is done. Per the repo's convention, these four docs can themselves be deleted from
`migration/` once their content is 100% reflected in reality and in `HANDOFF.md` — but
leave that decision to a follow-up pass, not this task, since deleting them
immediately after writing them removes the audit trail of what was done and why.
