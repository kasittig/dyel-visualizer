# API Phase 3: Verify the `@dyel/pipeline` boundary is actually enforced

## Status: AUTOMATED CHECKS DONE — awaiting human sign-off on manual dev-server check (item 5)

## Background

Third of four phased docs implementing the `@dyel/api`-as-sole-boundary decision (see
`API_PHASE_1.md` for full context). Phases 1 and 2 add and repoint code; this phase is
the acceptance check that the migration actually achieved its goal — nothing lints or
type-checks for "no direct `@dyel/pipeline` import in `packages/app`" today, so a
passing build/test suite alone does **not** prove the rule is satisfied. A stray
type-only import is still valid TypeScript.

## Task list

- [x] Task 32: Run `grep -rn "@dyel/pipeline" packages/app/src` and confirm the
      **only** remaining hits are: - `App.tsx` — `runPipelineModel` (function), `AthleteContext` (type) - `hooks/infra/usePipelineValidation.ts` — `runPipeline` (function)

      Any other hit means a Phase 2 task was missed, incompletely applied, or a new
      import crept in mid-migration. Do not proceed to `API_PHASE_4.md` until this
      grep returns exactly those two files. (Target: n/a — verification pass only,
      Test: `grep -rn "@dyel/pipeline" packages/app/src`)

      **DONE.** Confirmed via two independent passes (coordinator + `qa-reviewer`
      agent, separately): excluding `.test.` files and doc-comment mentions, the
      only real code imports are exactly the two documented exceptions. One new,
      previously-undocumented hit was found and assessed: `usePipelineVariationRadarData.test.ts`
      imports `runPipelineModel`/`PipelineModel` from `@dyel/pipeline` directly to
      build test fixtures. Judged acceptable — test-only, no application-code path
      affected, consistent with existing test-fixture convention — but flagging here
      since it wasn't called out as a known exception in Phase 2's HANDOFF.md notes.

## Full-repo regression gate

Run the complete workspace build/test sequence once, after Task 32 passes, as the
final gate before documentation cleanup:

```bash
npm run build -w packages/pipeline && npm run build -w packages/api && npm run build -w packages/app
npm test -w packages/pipeline && npm test -w packages/api && npm test -w packages/app
```

## Independent `qa-reviewer` verification

Per this repo's established practice (see `HANDOFF.md`'s history of independently
re-verifying agent-reported results rather than trusting self-report), a `qa-reviewer`
subagent should, from a clean `npm install`, independently:

1. Re-run the full build/test gate above.
2. Re-run Task 32's grep independently — do not trust the implementing agent's report
   that it returned only the two expected hits.
3. Confirm test _counts_ (not just pass/fail) went up or stayed flat vs. the
   pre-migration baseline, never down. A silently-deleted test file during a "move"
   in Phase 1/2 would not otherwise show up as a failure. Capture the pre-migration
   baseline count (`npm test -w packages/api` / `-w packages/app`) before Phase 1
   starts, if not already recorded.
4. Spot-check `packages/api/src/repCalculator/repCalculatorSelectors.ts`'s
   `resolveEffectiveCanonical` against the **original** pre-migration inline
   `effectiveCanonical` `useMemo` logic (from `RepCalculator.tsx` before Phase 2's
   Task 29 rewrite — check git history) for a handful of representative facet
   combinations (bar+stance+equipment+addlWt present/absent). Since this logic had
   zero test coverage before this migration, "tests pass" alone doesn't prove
   behavior preservation if the new tests were derived from the extracted
   implementation rather than independently hand-traced from the original component
   logic.
5. Manually drive `npm run dev -w packages/app` through the Rep Calculator tab with a
   real/fixture sheet and confirm no visible regression: facet dropdowns populate,
   e1RM estimate updates correctly on reps/weight input. This is the kind of runtime
   issue a passing test suite can miss if a selector call site was wired with a
   subtly wrong argument order during extraction.

## Verification results (this pass)

Full build/test gate re-run independently twice (coordinator + `qa-reviewer` agent,
from the current working tree):

- Builds: pipeline/api/app all clean, 0 TypeScript errors.
- Tests: pipeline 181/181, api 125/125, app 133/133 — all match documented baselines,
  no unexplained deltas.

`qa-reviewer` items 3-5 from this doc's checklist:

- **Item 3** (test count vs. baseline): PASS — counts match, no silent deletions found.
- **Item 4** (`resolveEffectiveCanonical` vs. original inline `effectiveCanonical`
  `useMemo` from pre-Phase-2 `RepCalculator.tsx`, commit `08465a1`): PASS, independently
  re-verified by the coordinator (not just taken on the agent's self-report, per this
  repo's standing practice) — direct side-by-side read of both implementations confirms
  the logic is unchanged line-for-line, only moved from a closure-based `useMemo` into a
  function taking a destructured params object. Call site
  (`usePipelineRepCalculator.ts:94`) passes the same param shape the function expects —
  no argument-order mismatch.
- **Item 5** (manual dev-server check of the Rep Calculator tab): **NOT YET DONE** —
  requires human interaction. Dev server started and left running at
  `http://localhost:5175` (ports 5173/5174 were already occupied) for manual
  verification: navigate to the Rep Calculator tab, confirm facet dropdowns populate,
  and confirm the e1RM estimate updates correctly as reps/weight are entered and as
  facets are changed. No console errors expected.

## Next

Task 32 and the full regression gate both pass, and `qa-reviewer` has independently
signed off on items 1-4. **Blocked on human sign-off for item 5** (manual dev-server
check) before proceeding to `API_PHASE_4.md`.
