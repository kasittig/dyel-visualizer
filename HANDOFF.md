# HANDOFF: `@dyel/api`-as-sole-boundary migration (migration-phase-1)

## Background

Live status tracker for the multi-phase migration making `@dyel/api` the sole boundary
between `packages/app` and `@dyel/pipeline` (see `migration/API_PHASE_1.md` for the full
rationale, superseding `migration/PipelineApiBoundary.md`). Four phased docs:

- `migration/API_PHASE_1.md` — add `@dyel/api` modules (**DONE, committed**)
- `migration/API_PHASE_2.md` — repoint `packages/app` consumers to `@dyel/api` (**DONE,
  all 19 tasks landed and verified — uncommitted, see below**)
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

## Phase 2: DONE — all 19 tasks (13-31) landed, verified, uncommitted

Delegated via `feature-implementer` (Group A/B mechanical swaps + cleanup) and
`senior-coder` (Tasks 28/29, the `RepCalculator.tsx` refactor). Final cross-package
regression (independently re-run via `qa-reviewer`, not just agent-reported):

- `npm run build -w packages/pipeline && npm run build -w packages/api && npm run build
-w packages/app`: all clean, 0 TypeScript errors
- `npm test -w packages/pipeline`: 181/181 (unaffected, matches baseline)
- `npm test -w packages/api`: 125/125 (unaffected, matches Phase 1 baseline)
- `npm test -w packages/app`: **133/133** (down from the 166/166 Phase 1 baseline —
  expected: 4 test files were deleted along with their now-dead source in Tasks 27/30/31
  — `pipelineChartUtils.test.ts`, `conjugateBestSet.test.ts`, `lastSessionDetail.test.ts`,
  `variationSnapshot.test.ts` — accounts for exactly the 33-test delta)

**Process notes for future phases:**

- Two `senior-coder` agent runs (Tasks 28 and 29) reported they had no shell/bash tool
  available in their sandbox and could only do static review, despite the agent
  definition listing `Command`. Both times I re-ran the actual `npm test`/`npm run
build` verification myself afterward rather than trusting the static review — this
  caught nothing broken in either case, but is worth flagging: don't trust a
  `senior-coder` "tests should pass" claim without independently re-running the actual
  commands.
- Task 29's agent (RepCalculator.tsx rewrite) left two real boundary leaks in its diff
  that I caught via manual `git diff` review after its self-report: (1) `CONJUGATE_BARS`/
  `CONJUGATE_STANCES`/`CONJUGATE_EQUIPMENT`/`CONJUGATE_ADDL_WTS` were still imported
  directly from `@dyel/pipeline` instead of `@dyel/api` (both export the same consts),
  and (2) the `E1RMEstimate` type was still imported from the now-almost-dead
  `../../pipeline/repCalculatorUtils` instead of `@dyel/api`. Neither broke the build
  (both are/were valid TypeScript), which is exactly the "build passing is necessary but
  not sufficient" trap the doc's Verification section warns about. Fixed directly rather
  than re-delegating. Worth a `grep -rln "@dyel/pipeline"` sanity sweep after any
  component-level task, not just a build/test check.
- The Task 30 agent (deleting `packages/app/src/pipeline/`) found a real leftover
  reference Task 26 had missed (`usePipelineVariationRadarData.ts` was still importing
  `conjugateChartSpecs` from the local `pipeline/` dir, not `@dyel/api`) and fixed it
  inline before deleting the directory — correct call, flagged and verified rather than
  blindly trusted.
- Final `grep -rln "@dyel/pipeline" packages/app/src` (excluding `.test.` files) turned
  up exactly the two documented exceptions (`App.tsx`, `usePipelineValidation.ts`) plus
  two files with only doc-comment mentions of `@dyel/pipeline` (no real imports) — this
  is the check Phase 3 should run first and treat as the acceptance gate.

**Doc status:** `migration/API_PHASE_2.md` updated — status line flipped to DONE, all 19
task checkboxes marked `[x]`. **Not yet committed** — everything in this phase (Tasks
13-31 code changes + the doc update) is sitting uncommitted in the working tree.

## Phase 2 archive: doc review before delegation (historical, kept for context)

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

1. Phase 2 is committed as of this update (see git log).
2. Proceed to `API_PHASE_3.md`'s verification gate (grep check + full regression +
   `qa-reviewer` sign-off) — the `grep -rln "@dyel/pipeline" packages/app/src` sweep run
   at the end of Phase 2 already found only the two documented exceptions plus harmless
   doc-comment mentions, so Phase 3 should mostly be confirming/formalizing that.
3. Then `API_PHASE_4.md`'s doc cleanup — which also records Task 12b (deleting
   `packages/pipeline`'s now-duplicated `facetsFromTags`/`facetFamilyKey`/
   `CONJUGATE_*`/`computeStrengthScores`/`LINE_COLORS`) as new work now that Phase 2's
   Tasks 19/20 (and the rest of Group A) are confirmed landed.

## Verification commands (reference)

```bash
npm run build -w packages/pipeline && npm run build -w packages/api && npm run build -w packages/app
npm test -w packages/pipeline && npm test -w packages/api && npm test -w packages/app
```
