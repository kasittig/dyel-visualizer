# HANDOFF: `@dyel/api`-as-sole-boundary migration (migration-phase-1)

## Background

Live status tracker for the multi-phase migration making `@dyel/api` the sole boundary
between `packages/app` and `@dyel/pipeline` (see `migration/API_PHASE_1.md` for the full
rationale, superseding `migration/PipelineApiBoundary.md`). Four phased docs:

- `migration/API_PHASE_1.md` — add `@dyel/api` modules (**DONE, committed**)
- `migration/API_PHASE_2.md` — repoint `packages/app` consumers to `@dyel/api` (**NOT
  STARTED — reviewed and one bug fixed, ready to delegate, see below**)
- `migration/API_PHASE_3.md` — verify the boundary is actually enforced (not started)
- `migration/API_PHASE_4.md` — documentation cleanup (not started)

The prior effort tracked in this file (`@dyel/core` removal) is complete and committed;
see git history.

## Phase 1: DONE (committed as `eb13f0f` on `migration-phase-1`)

All 12 tasks landed: `@dyel/api` gained owned copies of conjugate facets/best-sets/
chart-specs, session detail, variation snapshot/radar selectors, chart utilities,
rep-calculator utils/selectors, strength scores, colors, a shared `weightUnit.ts`, and a
documented `classifyExerciseName` re-export. `packages/app`/`packages/pipeline` were left
untouched (by design — both keep their originals until Phase 2 repoints consumers).

**One process note carried forward:** a `feature-implementer` agent doing Task 4 briefly
violated the "packages/app untouched" rule (rewrote `conjugateBestSet.ts` into a
re-export bridge, deleted its test). Caught via `git status packages/app/` after the
task, reverted with `git checkout`, and every subsequent task prompt got an explicit "do
not touch packages/app" reminder with a post-task `git status` check — no further
violations. Worth repeating this verification habit in Phase 2, inverted: Phase 2's
tasks are _supposed_ to touch `packages/app`, so the risk there is scope creep (an agent
touching files outside its assigned task) rather than an outright forbidden-directory
violation — spot-check `git status --short` after each task to confirm only the assigned
file(s) changed.

**Final verification (independently re-run, not just agent-reported):**

- `npm run build -w packages/api`: clean
- `npm test -w packages/api`: **125/125 passing** (11 test files) — this is the
  pre-Phase-2 baseline count for `packages/api`
- `npm run build -w packages/pipeline`: clean, unaffected
- `npm run build -w packages/app`: clean, unaffected
- `npm test -w packages/app`: **166/166 passing** — pre-Phase-2 baseline for `packages/app`
  (Phase 3's regression-count check should compare against this number)
- Commit `eb13f0f` also includes the pre-existing uncommitted `RepCalculator.tsx`
  refactor (Task 11 extracted from its working-tree state, per the phase doc's explicit
  instruction to use the working tree, not git HEAD)

Deferred out of Phase 1 on purpose: **Task 12b** (delete the now-duplicated
`facetsFromTags`/`facetFamilyKey`/`CONJUGATE_*`/`computeStrengthScores`/`LINE_COLORS`
from `packages/pipeline`) — blocked on Phase 2's Tasks 19/20 landing first, since
`packages/app` still imports pipeline's copies directly until then.

## Phase 2: doc review complete, one bug found and fixed, not yet delegated

Before delegating, cross-checked every export/file path `API_PHASE_2.md`'s 19 tasks
(13-31) assume against what Phase 1 actually produced.

**Bug found and fixed (uncommitted edit in `migration/API_PHASE_2.md`):** Task 22 told
the implementer to swap `buildDatasetsFromModel` to `@dyel/api`, but that function is
deliberately **not exported** from `@dyel/api` (Phase 1's own Design decisions section
keeps it engine-internal, used only inside `getCompetitionTotal.ts`) — confirmed absent
from `packages/api/src/index.ts`. Task was impossible as written. Rewrote it to instead
add a small new `packages/api/src/chart/buildChartDatasets.ts` wrapper (mirroring
`getCompetitionTotal.ts`'s existing precedent), export it from `index.ts`, and have
`usePipelineDatasets.ts` call that. Also updated the stale "blocked by API_PHASE_1.md"
status line now that Phase 1 is done.

**Everything else checked out:** all other referenced exports exist exactly as named
(`computeStrengthScores`, `LINE_COLORS`, `classifyExerciseName`, `conjugateChartSpecs`,
`buildBestSetByLabelAndDate`, `buildLastSessionDetail`,
`snapshotVariationsFromPipeline`/`snapshotNormalizedVariationsFromPipeline`,
`buildCanonicalByLabel`/`resolveTargetLabel`, the chart-utils quartet, rep-calculator
utils/selectors, all type-only re-exports); all 22 target file paths in Tasks 13-31
exist on disk; `usePipelineRepCalculator.ts`'s "dead code, unused by RepCalculator.tsx"
description (load-bearing for the Task 28/29 design decision) still holds — confirmed by
grep, only the barrel `hooks/pipeline/index.ts` references it today.

**Delegation-readiness assessment (not yet acted on):**

- **Ready for a lighter/faster model (haiku):** Tasks 13-21, 23-27, 30, 31 — mechanical,
  single-file import-path swaps or grep-and-repoint/delete work with clear test
  commands. Sampled the underlying current files for Tasks 25 and 26 directly (not just
  trusting the doc) — both are confirmed to be clean 1:1 substitutions against Phase 1's
  new exports/selectors, no open-ended logic work.
- **Borderline, give extra QA scrutiny regardless of model:** Task 22 (the newly-fixed
  one) — spans creating new `packages/api` code and editing `packages/app` in the same
  task, more surface area than a pure swap.
- **Keep on a stronger model (sonnet), NOT haiku:** Tasks 28 and 29
  (`usePipelineRepCalculator.ts` extension + `RepCalculator.tsx` render-only rewrite).
  Read the current `RepCalculator.tsx`: 5 `useState` fields, a `useRef`, a `useEffect`
  with a real dependency-array subtlety (`syncWeightFromReps` closing over
  `estimate`/`unit`), several interdependent `useMemo`s — moving all of this into a hook
  while preserving exact runtime behavior is genuine refactoring risk (stale closures,
  wrong dependency arrays, effect-ordering bugs), not a mechanical swap. This is exactly
  why `API_PHASE_3.md`'s own QA checklist singles this file out for manual runtime
  verification rather than trusting tests alone. The doc also mandates Tasks 28/29 be
  sequenced/paired (28 before, or with, 29 — never parallel, never split across
  independently-briefed fresh agents), which should be preserved regardless of model
  choice.

## Next

1. Decide whether to commit the `migration/API_PHASE_2.md` fix (currently uncommitted —
   `git diff --stat` shows just that one file, +24/-5 lines).
2. Delegate Phase 2's Group A tasks (13-27, 30, 31) — sequentially or in small batches
   where file scopes don't overlap, each followed by `npm run build -w packages/app &&
npm test -w packages/app` verification (see Phase 1's execution pattern in git
   history for the sequencing/verification approach to reuse).
3. Handle Tasks 28/29 as a paired, same-session unit on a stronger model, verified
   against the working-tree `RepCalculator.tsx` (not git history) the same way Phase
   1's Task 11 was.
4. Once all of Phase 2 lands and `packages/app` build/tests are green, proceed to
   `API_PHASE_3.md`'s verification gate (grep check + full regression + `qa-reviewer`
   sign-off), then `API_PHASE_4.md`'s doc cleanup — which also records Task 12b as new
   work once Phase 2's Tasks 19/20 are confirmed landed.

## Verification commands (reference)

```bash
npm run build -w packages/pipeline && npm run build -w packages/api && npm run build -w packages/app
npm test -w packages/pipeline && npm test -w packages/api && npm test -w packages/app
```
