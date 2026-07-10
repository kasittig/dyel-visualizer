# API Phase 3: Verify the `@dyel/pipeline` boundary is actually enforced

## Status: NOT STARTED (blocked by `API_PHASE_2.md`)

## Background

Third of four phased docs implementing the `@dyel/api`-as-sole-boundary decision (see
`API_PHASE_1.md` for full context). Phases 1 and 2 add and repoint code; this phase is
the acceptance check that the migration actually achieved its goal — nothing lints or
type-checks for "no direct `@dyel/pipeline` import in `packages/app`" today, so a
passing build/test suite alone does **not** prove the rule is satisfied. A stray
type-only import is still valid TypeScript.

## Task list

- [ ] Task 32: Run `grep -rn "@dyel/pipeline" packages/app/src` and confirm the
      **only** remaining hits are: - `App.tsx` — `runPipelineModel` (function), `AthleteContext` (type) - `hooks/infra/usePipelineValidation.ts` — `runPipeline` (function)

      Any other hit means a Phase 2 task was missed, incompletely applied, or a new
      import crept in mid-migration. Do not proceed to `API_PHASE_4.md` until this
      grep returns exactly those two files. (Target: n/a — verification pass only,
      Test: `grep -rn "@dyel/pipeline" packages/app/src`)

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

## Next

Once Task 32 and the full regression gate both pass, and `qa-reviewer` has
independently signed off, proceed to `API_PHASE_4.md`.
