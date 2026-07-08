# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Full per-component gap inventory
lives in `GAPS_REMAINING.md` (still current, not superseded). Historical root-cause
detail for the fit-window/volume-filtering investigation lives in `LEGACY_MIGRATION.md`
and `VOLUME_FILTER_DESIGN.md` — both still current, referenced below rather than
re-summarized. §0 (parity gap) is closed; this session's work is on §5
(`DiagnosticsPanel`), the next item in `GAPS_REMAINING.md`'s stated priority order.

## Progress Overview

- **Removed the abandoned worktree** (prior session's Open TODO #1):
  `.claude/worktrees/agent-a521f01946ae87249` + its branch
  (`worktree-agent-a521f01946ae87249`) were force-removed after inspection confirmed
  the uncommitted `RepCalculator.tsx` draft was stale — rooted at an old PR-#454 merge
  that predates the `usePipelineRepCalculator.ts`/`repCalculatorUtils.ts` scaffolding
  already committed on `main` (`df15c89`/`c180add`), and took an incompatible approach
  (new local `repCalculatorStats.ts`, inlined `CONJUGATE_*` constants) rather than
  using what's already built. Confirmed no shortcut was lost — `GAPS_REMAINING.md` §2
  Task 2b's actual remaining work is exactly as documented (swap `RepCalculator.tsx`'s
  `@dyel/core` imports for the already-existing pipeline hook/util pair).
- **Reframed `GAPS_REMAINING.md` §5 (`DiagnosticsPanel`)** — investigation found that
  2 of the 3 "needs design sign-off" blockers listed in `DiagnosticsPanel.md`/
  `GAPS_REMAINING.md` are actually a data-restoration + wiring problem, not a novel
  modeling problem (5a display-name, 5b range model, 5c classification — see below).
  User confirmed: proceed straight to implementation of 5a-5c (no separate sign-off
  doc needed) rather than writing design proposals first.
- **Implemented and verified 5a-5c in `@dyel/pipeline`** (all changes below are
  **uncommitted** — see Files Touched):
  1. Restored `min`/`max` to all 44 applicable entries in
     `packages/pipeline/src/tag/detect/modifier-effects.json` (re-keyed from
     `packages/core/modifierEffects.json`). The 9 `addl:*` entries correctly have no
     `min`/`max` (addlWt-only exercises use a 100–100% fallback).
  2. `packages/pipeline/src/tag/detect/canonical.ts`: `buildTagsAndEffects` now also
     returns a `range: BaselineRange | null` (new exported `BaselineRange` interface),
     computed multiplicatively across active bar/stance/equipment modifiers in the
     same order as legacy's `generateDiagnostics.ts` (equipment, then stance, then
     bar).
  3. `packages/pipeline/src/tag/tag.ts`: `TaggedSetRecord` gained a required
     `baselineRange: BaselineRange | null` field.
  4. `packages/pipeline/src/analyze/diagnose.ts`: `VariantAssessment` gained
     `displayName`, `averageIndex` (= `factor * 100`), `expectedBaseline`
     (`"${min}-${max}%"`). `diagnose()` gained two optional trailing params
     (`displayNameByCanonical`, `baselineRangeByCanonical`). `status` classification
     now prefers range-based comparison when a range exists, falling back to
     flat-tolerance otherwise. Kept pipeline's own status vocabulary
     (`'overperforming'`, not legacy's `'overtrained'`) — only the comparison basis
     changed, not the enum.
  5. `packages/pipeline/src/pipeline.ts`: builds and passes `displayNameByCanonical`/
     `baselineRangeByCanonical` into `diagnose()`.
  6. Verified: `npm test -w packages/pipeline` green (128 tests) including the new
     `describe('buildTagsAndEffects baseline % range', ...)` block (bare-lift → null,
     single modifier, addlWt-only → 100-100 fallback, `Sumo Box Squat` compound
     multiplication → `{min:81,max:100}`, hand-verified against the merged JSON).
- **QA cross-check surfaced a real residual gap** in `diagnosticsPanelParity.test.ts`'s
  deadlift soft-warn: `pipeline(opt=5,weak=2,over=0)` vs `legacy(opt=4,weak=1,over=3)`
  — `over` never crossed off 0. Investigated further (see below) rather than accepting
  as-is, since `over=0` felt like a real remaining bug, not noise.
- **Root-caused and ported deadlift-specific stance resolution** (a real gap, not yet
  covered by 5a-5c): legacy's `generateDiagnostics.ts` resolves a deadlift's stance
  (via `resolveDeadliftStance`, using the athlete's `deadliftStance` preference) even
  when the raw parsed stance is `null`/`'opposite'` — folding a stance percentage-range
  into the calculation that pipeline's `buildTagsAndEffects` was skipping entirely
  (since it only applied stance range/effects when the raw stance was _explicit_).
  Ported `resolveDeadliftStance` into `packages/pipeline/src/tag/detect/canonical.ts`,
  threaded a `deadliftStance: 'sumo' | 'conventional' = 'sumo'` param through
  `buildTagsAndEffects` → `tagRecords` → `runPipeline` (sourced from
  `AthleteContext.deadliftStance`, already present).
  - **Two implementation bugs were found and fixed during this work (both caught by
    manual diff review, not by the test suite — see Open TODO 8's process note):**
    1. An over-broad early-return restructure accidentally stripped the `comp-lift`
       tag from bare deadlift entries, which would have broken
       `normalize.ts`'s baseline-auto-detection fallback (`tags.has('comp-lift')`) for
       deadlift specifically. Fixed by decoupling tag-assignment from the
       range-computation early-return.
    2. The stance-resolution condition didn't exclude deadlifts with the default
       `'competition'` stance (no stance modifier logged at all), causing spurious
       stance-range compounding on equipment-only deadlift variants (e.g.
       `"Deadlift (2\" deficit)"` wrongly computed `77-95%` instead of the correct
       equipment-only `85-95%`). Legacy's exact condition only resolves for
       `null`/`'sumo'`/`'conventional'`/`'opposite'`, explicitly excluding
       `'competition'`. Fixed to match.
  - Both fixes have regression-guard tests in `canonical.test.ts`.
- **Final verified state**: `npm test -w packages/pipeline` (138 tests) and
  `npm test -w packages/app` (205 tests) both green. `diagnosticsPanelParity.test.ts`'s
  deadlift soft-warn: `pipeline(opt=6,weak=1,over=0)` vs `legacy(opt=4,weak=1,over=3)`
  — `weak` now matches exactly, `opt` is closer, `over` remains at 0.
- **Found (not fixed) two further, genuinely separate gaps while investigating the
  stuck `over=0`** — both now tracked as new `GAPS_REMAINING.md` §5 tasks, since they
  are NOT range/classification-model problems:
  - **Task 5g — variant-factor model-fitting divergence.** Direct per-variant
    comparison shows that even when pipeline and legacy compute the _identical_
    baseline range for a variant, `averageIndex` (fitted variant-factor × 100)
    diverges substantially: `"Deadlift (opposite)"` — pipeline `98.7` vs legacy
    `105.2`; `"Deadlift (opposite, 1 chain)"` (n=1 in pipeline, unfit/defaults to
    exactly 100) vs legacy `115.9`. This points at `packages/pipeline/src/derive/
normalize.ts`'s `fitNormalizationModel` diverging from legacy's
    `fitVariantFactor`/`buildSessionStats` — unrelated to this session's range work,
    likely a materially larger investigation.
  - **Task 5h — variant-count mismatch (7 vs 8).** Legacy's deadlift results include
    `"Deadlift (2\" deficit, opposite)"` (compound equipment + explicit-stance
    variant); pipeline's has no counterpart. Not yet root-caused.

## Decisions Made & Rationale

- **Removed the abandoned worktree rather than salvaging it** — confirmed via
  `git log`/`git diff --stat` inspection that it predates current scaffolding and
  takes an incompatible approach; user explicitly confirmed removal.
- **Proceeded straight to implementation for §5's 5a-5c instead of writing separate
  design-proposal docs first** — the investigation showed these were data-restoration/
  wiring fixes, not open-ended modeling decisions. User confirmed this approach.
- **Kept pipeline's `'overperforming'` status value instead of renaming to legacy's
  `'overtrained'`** — the goal was reconciling the _comparison logic_, not the
  vocabulary; renaming would be a breaking change for zero behavioral benefit.
- **New `diagnose()` params are optional/trailing with empty-`Map` defaults** rather
  than a breaking signature change — every existing call site continues to work
  unchanged.
- **Investigated the stuck `over=0` signal rather than accepting 5a-5c as "done" once
  tests were green** — the soft-warn numbers moving in an unexpected direction (worse,
  not better, after the first stance-resolution attempt: `opt=7,weak=0,over=0`) was
  treated as a signal worth digging into, not noise to wait out. This surfaced the two
  real bugs above before they could have been mistaken for "expected residual
  divergence."
- **Deferred Task 5g (variant-factor-fitting divergence) rather than continuing to
  chase it this session** — confirmed via direct evidence it's a different root cause
  (model-fitting, not range/classification) and likely a substantially larger,
  separate investigation. Scoping it further wasn't a good use of remaining session
  budget; documented with concrete numbers instead so the next session can pick it up
  without re-deriving the evidence.

## Open TODOs

1. ~~Verify the new `canonical.test.ts` range-assertions pass~~ **Done.**
2. ~~Full regression pass~~ **Done** — pipeline (138 tests) and app (205 tests) both
   green as of the final state described above.
3. **Nothing has been committed.** All changes remain working-tree only, per explicit
   user instruction this session.
4. ~~QA cross-check against `DiagnosticsPanel.md`'s root cause~~ **Done**, see Progress
   Overview — real finding (Task 5g) came out of this, not just a pass/fail signal.
5. ~~Update `GAPS_REMAINING.md`~~ **Done** — §5 rewritten: 5a-5c marked done, new Tasks
   5g/5h added with full evidence.
6. **§5 Tasks 5d-5f are still open and unstarted**: 5d (addl-weight offset data for
   display formatting), 5e (rework `usePipelineDiagnostics`'s self-fetching prop
   surface vs `DiagnosticsPanel.tsx`'s pre-computed-props shape, plus
   `LiftTabPanel.tsx` prop-drilling), 5f (the actual `DiagnosticsPanel.tsx` swap-over +
   promote `diagnosticsPanelParity.test.ts` to hard-assert — now also blocked on
   5g/5h, not just 5d/5e).
7. **New: Task 5g — variant-factor model-fitting divergence** (see Progress Overview
   for concrete numbers). Not started; likely the next big investigation, comparable
   in scope to the original volume/speed-work filtering investigation
   (`VOLUME_FILTER_DESIGN.md`). Target: `packages/pipeline/src/derive/normalize.ts`.
8. **New: Task 5h — 7-vs-8 variant-count mismatch** (`"Deadlift (2\" deficit,
opposite)"` missing from pipeline). Not started, not yet root-caused.
9. **Everything else in `GAPS_REMAINING.md` outside §5** is untouched and current:
   §3/§4 `ConjugateCharts`/`VariationRadarChart` swap-overs, §2
   `RepCalculator`/`StrengthScoreCalculator`, §6 `LiftTabPanel`, §7 `ValidatorPage`
   scope question, §1 `TotalChart` type-only cleanup.
10. File a GitHub tracking issue for the (already-closed, prior-session) volume/speed-
    work filtering gap — user explicitly said not to file one for that this session;
    still open from a prior handoff if it becomes relevant again.
11. **RPE range-validation gap** (found in a prior session, not fixed): pipeline's CSV
    parser doesn't range-check RPE (`[1,10]`) the way legacy does. No fixture
    demonstrates a concrete failure; documented in `VOLUME_FILTER_DESIGN.md`.
12. **Process note for next session:** two implementation bugs (see Progress Overview)
    slipped past the test suite this session and were only caught by manually
    re-reading the diff against legacy's exact conditional logic line-by-line — the
    tests stayed green throughout both bugs because the new tests were written to
    match the (buggy) implementation, not derived independently from legacy's spec.
    Worth deliberately cross-checking new pipeline logic against the _exact_ legacy
    condition (not a paraphrase) before treating "tests pass" as sufficient signoff on
    future parity work, especially anything touching `canonical.ts`'s modifier/stance
    resolution.

## Files Touched

All uncommitted (working tree only):

- `packages/pipeline/src/tag/detect/modifier-effects.json` — restored `min`/`max` to
  44 of 53 entries (re-keyed from `packages/core/modifierEffects.json`)
- `packages/pipeline/src/tag/detect/canonical.ts` — `buildTagsAndEffects` returns
  `range: BaselineRange | null`; new exported `BaselineRange` interface and
  `resolveDeadliftStance` function; `deadliftStance` param threaded through; bare-
  variant/`comp-lift`-tag and `'competition'`-stance-exclusion fixes applied
- `packages/pipeline/src/tag/detect/canonical.test.ts` — range-assertion test block,
  deadlift-stance-resolution test block (including regression guards for both bugs
  found this session), all verified passing
- `packages/pipeline/src/tag/tag.ts` — `TaggedSetRecord.baselineRange` field added;
  `tagRecords` accepts and threads `deadliftStance` param
- `packages/pipeline/src/analyze/diagnose.ts` — `VariantAssessment.displayName`/
  `averageIndex`/`expectedBaseline` added; `diagnose()` gained two optional trailing
  params; range-based status classification with flat-tolerance fallback
- `packages/pipeline/src/pipeline.ts` — builds and passes `displayNameByCanonical`/
  `baselineRangeByCanonical` into `diagnose()`; passes `athlete.deadliftStance` into
  `tagRecords()`
- `packages/pipeline/src/derive/derivers.test.ts`,
  `packages/pipeline/src/derive/normalize.test.ts`,
  `packages/app/src/pipeline/lastSessionDetail.test.ts` — added
  `baselineRange: null` to existing `TaggedSetRecord` literal fixtures to satisfy the
  new required field (mechanical fixups, no behavior change)
- `GAPS_REMAINING.md` — §5 rewritten to reflect 5a-5c done, new Tasks 5g/5h added
- `HANDOFF.md` — this file

Also present in the working tree from a prior session/unrelated context (not touched
this session, listed for completeness since `git status` shows them): `.claude/agents/
feature-implementer.md`, `.claude/agents/team-lead.md`, `.claude/skills/handoff/
SKILL.md`, deleted `SPECIFICATIONS.md`, `migration/LiftTabPanel.md`, plus untracked
`.agents/`, `.codex/`, `AGENTS.md`.

## Suggested Next Skills

- Nothing is blocking a commit of this session's work if you want one — everything is
  verified green (pipeline 138/138, app 205/205) and `GAPS_REMAINING.md` is already
  updated to reflect exactly what landed. Still intentionally uncommitted per this
  session's carried-over instruction; ask before committing.
- Next substantive work is Task 5g (variant-factor model-fitting divergence) — treat
  it as its own investigation, likely comparable in size to the volume/speed-work
  filtering work documented in `VOLUME_FILTER_DESIGN.md`. Start from the concrete
  numbers already captured above rather than re-deriving them.
- Task 5h (7-vs-8 count mismatch) is smaller and could be picked off first/in parallel.
- 5d/5e/5f remain blocked/sequenced after 5g/5h per the updated `GAPS_REMAINING.md`.
