# HANDOFF: `@dyel/api`-as-sole-boundary migration (migration-phase-1)

## Background

Live status tracker for the multi-phase migration making `@dyel/api` the sole boundary
between `packages/app` and `@dyel/pipeline` (see `migration/API_PHASE_1.md` for the full
rationale, superseding `migration/PipelineApiBoundary.md`). Four phased docs:

- `migration/API_PHASE_1.md` — add `@dyel/api` modules (**DONE, committed**)
- `migration/API_PHASE_2.md` — repoint `packages/app` consumers to `@dyel/api` (**DONE,
  all 19 tasks landed and verified — uncommitted, see below**)
- `migration/API_PHASE_3.md` — verify the boundary is actually enforced (**DONE** —
  human sign-off on the manual dev-server check landed, see below)
- `migration/API_PHASE_4.md` — documentation cleanup (**DONE** — see below)

The `@dyel/api`-as-sole-boundary migration (Phases 1-4) is now fully complete.
`migration/PipelineApiBoundary.md`, the doc this migration superseded, has been
deleted per the repo's "delete once 100% done" `migration/` convention.

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

## Phase 3: automated checks DONE, blocked on human sign-off

Task 32 (grep sweep) and the full build/test regression gate were run independently
twice — once directly by the coordinator, once by a `qa-reviewer` agent — from the
current working tree. Both passed cleanly:

- Builds: `pipeline`/`api`/`app` all clean, 0 TypeScript errors.
- Tests: pipeline 181/181, api 125/125, app 133/133 — match documented baselines
  exactly, no unexplained deltas.
- Grep sweep: excluding `.test.` files and doc-comment mentions, only the two
  documented exceptions remain (`App.tsx`, `usePipelineValidation.ts`).
- New (previously undocumented) test-only exception found and assessed as acceptable:
  `usePipelineVariationRadarData.test.ts` imports `runPipelineModel`/`PipelineModel`
  directly from `@dyel/pipeline` to build fixtures — no app-code path affected.
- The doc's Item 4 (spot-check `resolveEffectiveCanonical` against the original
  pre-migration inline `effectiveCanonical` `useMemo`, the one piece of this migration
  with zero pre-existing test coverage) was independently re-verified by the
  coordinator via direct side-by-side read of both implementations (commit `08465a1`
  for the original, `packages/api/src/repCalculator/repCalculatorSelectors.ts` for the
  current) — not just taken on the `qa-reviewer` agent's self-report, consistent with
  this doc's standing practice. Confirmed logic is unchanged line-for-line; only the
  call site's param-object shape changed, and that shape matches what
  `usePipelineRepCalculator.ts:94` actually passes.

**Item 5, the manual dev-server check: DONE.** Human confirmed via the dev server
(left running per this repo's convention) that the Rep Calculator tab works
correctly — facet dropdowns populate, e1RM estimate updates correctly on reps/weight
input and facet changes, no console errors. Phase 3 is fully signed off.

Full detail in `migration/API_PHASE_3.md`'s "Verification results" section.

## Phase 4: DONE — all tasks (33-36) landed, independently verified

Tasks 33 (doc updates) and 36 (formerly "Task 12b", the deferred pipeline dedup
cleanup) were delegated to `feature-implementer` agents in parallel (disjoint file
sets — doc-only vs. `packages/pipeline`/`packages/api` source). Tasks 34 (delete
`migration/PipelineApiBoundary.md`) and 35 (this update) were done directly.

**Pre-delegation audit caught a real gap before assigning Task 36**, same practice as
prior phases: the original "Task 12b" description in `API_PHASE_1.md` didn't account
for (a) `packages/api/src/sheet/defaultExercise.ts` still importing `facetsFromTags`
directly from `@dyel/pipeline` instead of `@dyel/api`'s own copy — deleting pipeline's
copy first would have broken `packages/api`'s build; (b) `athlete.ts` helpers/consts
exclusive to `computeStrengthScores` (not shared with `wilks`/`dots`, which must keep
working) needing cleanup too; (c) matching pipeline-side test blocks in
`tag.test.ts`/`athlete.test.ts` that would fail to compile once their functions were
deleted. All three were folded into the task prompt up front rather than left for the
agent to discover/improvise.

**Task 33 (doc updates) — one gap the agent missed, caught and fixed directly:** the
agent updated `RepCalculator.tsx`/`StrengthScoreCalculator.tsx` doc rows correctly but
missed two other rows in `hooks/pipeline/CLAUDE.md` (`usePipelineConjugateChartData.ts`,
`usePipelineVariationRadarData.ts`) still referencing the deleted local
`pipeline/*.ts`/`utils/*.ts` paths instead of `@dyel/api`, plus a stale paragraph in
`packages/app/CLAUDE.md` explaining why `src/pipeline/` "remains named `pipeline/`" —
that directory no longer exists (deleted in Phase 2 Task 30). Fixed directly after
independently re-reading all three docs against current source rather than trusting
the agent's "verified by reading" self-report.

**Task 36 final verification (independently re-run, not just agent-reported):**

- `packages/pipeline`: build clean, tests **181 → 157** (24 removed — matches the 2
  deleted `tag.test.ts` describe blocks + 1 deleted `athlete.test.ts` describe block)
- `packages/api`: build clean, tests **125/125 unchanged**
- `packages/app`: build clean, tests **133/133 unchanged**
- Grep sweep for all 5 deleted symbols across `packages/pipeline/src`: zero real hits,
  one harmless doc-comment mention of `facetsFromTags` by name in `canonical.ts`
- Full `git diff` reviewed directly: `index.ts`'s export list is a clean surgical
  removal; `LiftMetrics` type-export removal confirmed safe since `packages/api`'s
  `strengthScores.ts` independently defines its own `LiftMetrics` interface rather
  than importing pipeline's

Full detail in `migration/API_PHASE_4.md`.

## Final verification summary (whole migration, Phases 1-4)

Final state of the full workspace regression gate as of Phase 4's completion:

- `npm run build -w packages/pipeline && npm run build -w packages/api && npm run
build -w packages/app`: all clean, 0 TypeScript errors
- `npm test -w packages/pipeline`: **157/157** (down from the Phase 1/2 baseline of
  181 — expected, Phase 4 Task 36 deleted 24 now-duplicated-elsewhere tests)
- `npm test -w packages/api`: **125/125** (unchanged since Phase 1)
- `npm test -w packages/app`: **133/133** (down from the pre-Phase-2 baseline of 166 —
  expected, Phase 2 deleted 33 tests along with now-dead source)
- `grep -rn "@dyel/pipeline" packages/app/src` (excluding `.test.` files and
  doc-comment mentions): only the two documented exceptions (`App.tsx`,
  `usePipelineValidation.ts`)

## App Refactor Migration — Phase 1: DONE (on `migration-phase-1`)

New 5-phase migration (feature organization + unidirectional data flow); plan lives in
`migration/README.md` + `migration/phase-1-api-additions.md` … `phase-5-enforcement-docs.md`
(supersedes the deleted `migration/API_PHASE_*.md`, whose content is fully recorded above).

Phase 1 added every function the app will need to `@dyel/api`, **without touching
`packages/app`** (validators were COPIED, not moved; `git status --short packages/app`
verified empty after every task and at phase end):

- Barrel-exported `convertWeight`/`roundWeight`/`formatWeight`/`DisplayUnit` + copied test
- New modules: `dateRange/dateRangeUtils`, `model/modelSelectors`,
  `diagnostics/{diagnosticsSelectors,diagnosticsUtils}`, `conjugate/conjugateChartData`,
  `validation/validationVerdict`, `pipeline/{buildPipelineModel,validatePipelineRun}`
  (documented raw-input entry points), copied `validation/{pipelineSheetValidator,pipelineFreeformValidator}`
- Additions to existing modules: `latestLiftE1RMs` (chart), `buildRadarRows` (variation),
  `strengthTierForPercentile` (strengthScores), `roundTo5` (repCalculator — audited vs
  `roundWeight`, semantics differ so it was added rather than reused)
- `papaparse`/`@types/papaparse` added to `packages/api` deps (versions match pipeline)

**Test-count delta:** `packages/api` 125 → **322** (+197; 22 files). App 133 and pipeline
157 unchanged. All three packages build; `npx eslint packages/app packages/api` clean.

**Process notes:** two delegated modules initially failed `tsc`/ESLint despite green
vitest runs (vitest doesn't type-check as strictly) — fixed at phase verification:
`latestLiftE1RMs` ChartPoint narrowing, `validatePipelineRun` rewritten to `runPipeline`'s
real signature `(raw, [], athlete, {})`, `buildRadarRows` single-pass filter typing,
`no-explicit-any` in two test files. Worth telling implementer agents to run
`npm run build -w packages/api` in addition to tests. Also fixed a pre-existing doc gap:
`buildChartDatasets` was missing from the `packages/api/CLAUDE.md` export table.

Next: Phase 2 (`migration/phase-2-render-only-components.md`) — repoint app hooks +
components at the new API functions; new branch off `main` after this phase's PR lands.

## App Refactor Migration — Phase 2: DONE (on `app-refactor-phase-2`)

All 12 tasks from `migration/phase-2-render-only-components.md` landed as one commit
each (stacked branch off `migration-phase-1`, since Phase 1's PR #467 hadn't merged yet —
rebase onto `main` + retarget the PR once it does):

- **Deleted app-side duplicates:** `utils/weightUnit.ts` (+test), `utils/validators/`
  (both validators + tests) — consumers repointed to `@dyel/api`
  (`convertWeight`/`roundWeight`/`DisplayUnit`, `validateSheetCsv`/`validateTextData`)
- **Components made render-only:** `SigmaChart` (→ `latestLiftE1RMs`),
  `VariationRadarChart` (→ `buildRadarRows`), `DiagnosticsPanel` (→ `summarizeEffects`
  - api `formatEffect`/`formatAddlWtOffset`), `StrengthScoreCalculator`
    (→ `strengthTierForPercentile` + new hook), `DateRangePicker`
    (→ `presetDateRange`/`activePreset`), `PipelineValidationPage`
    (→ `classifyPipelineVerdict`), `SigmaTab` (→ new hook)
- **Hooks slimmed to thin wrappers:** `usePipelineDiagnostics` (now memoized, →
  `selectDiagnosticVariants`), `usePipelineConjugateChartData` (→
  `buildConjugateChartData` + `roundBestSetsForDisplay` + `dateRangeToRenderParams`),
  `usePipelineTotalChartData` (→ `dateRangeToRenderParams`), `usePipelineRepCalculator`
  (roundTo5 swap only, per plan)
- **New hooks:** `useStrengthScores`, `useSigmaChartData` (both in `hooks/pipeline/`,
  barrel + CLAUDE.md updated)

**Behavior note (DateRangePicker):** ALL TIME now emits `{ from: undefined, to: latest }`
(the api's `activePreset` semantics) instead of `{ from: earliest, to: latest }` —
`dateRangeToRenderParams` treats undefined `from` as "no filter", so rendering is
equivalent; a persisted old-style all-time range will highlight CUSTOM instead of
ALL TIME (cosmetic, one-time).

**Test-count delta:** `packages/app` 133 → **76** (−57: weightUnit test −26 and the two
validator tests −20 moved to api in Phase 1; `usePipelineDiagnostics.test.ts` shrunk to
wiring-level 16 → 5 tests, −11). api 322 and pipeline 157 unchanged. All three packages
build; `npx eslint packages/app packages/api` clean; `@dyel/pipeline` imports in app
production code remain only `App.tsx` + `usePipelineValidation.ts`.

**Grep check:** only two `useMemo`s left under `components/**` — SigmaChart's single
`latestLiftE1RMs` call and DateRangePicker's `latestDate` max (UI concern).

**Smoke (Playwright via run-dyel-visualizer, real test sheet):** Σ tab (e1RM/radar/
volume), squat/bench/deadlift tabs (chart + radar + diagnostics with api formatters),
Calculator (rep calc e1RM + strength scores/competition total via `useStrengthScores`),
date presets incl. ALL TIME active-highlighting, `?page=validator` (150/150 parsed) and
`?page=pipeline-validation` (warning verdict + unknown/unnormalized lists). Zero console
or page errors. Dev server left running at localhost:5173.

**Process notes:** two implementer agents left stray `test_output.txt` files in the repo
root (one nearly got committed — caught via `git status --short` after every task; later
prompts explicitly banned redirecting test output to files). One agent wrote a
conditional `useMemo` (after early return) + an `any` in a test — both caught by the
pre-commit ESLint hook, fixed by team-lead. The per-task `git status --short` scope
check caught no scope creep across all 12 tasks.

Next: Phase 3 (`migration/phase-3-app-decomposition.md`) — App.tsx decomposition +
eslint allowlist shrink; new branch off `main` after Phase 2's PR lands.

## App Refactor Migration — Phase 3: DONE (on `app-refactor-phase-3`)

All 7 tasks from `migration/phase-3-app-decomposition.md` landed (stacked off
`app-refactor-phase-2`, since Phase 2's PR #468 hadn't merged to `main` yet — same
stacking pattern as Phase 2 off `migration-phase-1`).

- **Three new hooks** in `packages/app/src/hooks/app/` (barrel + `CLAUDE.md` added,
  matching the `hooks/infra`/`hooks/pipeline` convention):
  - `useAppSettings()` — all settings state (`url`/`inputMode`/`pastedText`/`activeTab`/
    `deadliftStance`, localStorage-backed; `dateRange`/`panelForcedOpen`/`refreshToken`/
    `shownResetToken`), the `?sheet=`/`?mode=`/`?text=` query-param reconciliation, the
    URL-sync effect, the `athlete` memo, and the three `handle*Change` handlers
  - `usePipelineOrchestration(inputMode, url, pastedText, refreshToken, athlete)` —
    raw-input resolution, **`buildPipelineModel` (`@dyel/api`) replacing both
    `runPipelineModel` (`@dyel/pipeline`) call sites**, the localStorage-persisted
    raw-data cache, and the effective status/model fallback logic
  - `useVisualizerData(model, dateRange, deadliftStance)` — `tabRows` plus a real dedup
    (not just a move) of previously hand-rolled inline logic into `@dyel/api` calls:
    `defaultCanonicalsByLift` (baseline/target canonicals were literally duplicate
    loops), `visibleLiftTypes`, `detectDataUnit`, `collectVolumeRecords`,
    `collectSessionDates`
- **App.tsx**: 441 → 179 lines (JSX return block byte-for-byte identical, confirmed by
  direct read/diff, not just the agent's self-report); composes the three hooks above;
  `@dyel/pipeline` import removed entirely.
- **`usePipelineValidation.ts`**: swapped `runPipeline` (`@dyel/pipeline`) for
  `validatePipelineRun` (`@dyel/api`) — confirmed a true drop-in (same dataset-specs-`[]`/
  render-params-`{}` call shape) before swapping, not just assumed.
- **Split two mixed util files**: `rawInputUtils.ts` → `rawInput.ts` (pure) +
  `useResolvedRawInput.ts` (hook); `appUtils.ts` → `sheetRef.ts` (pure) + `appTabs.ts`
  (UI types/consts); `LIFT_TABS` deleted (grep-confirmed unused after the
  `useVisualizerData` dedup). 16 importers repointed.
- **ESLint allowlist** (`eslint.config.js`) shrunk from 3 files to 1
  (`usePipelineVariationRadarData.test.ts` only) — `App.tsx` and
  `usePipelineValidation.ts` no longer need the exception. `PipelineContext.tsx`'s doc
  comment updated to name `usePipelineOrchestration` as the model producer (provider
  itself unchanged, still a dumb pass-through).

**Process note — a real parallel-task collision, caught before Task 3.4:** Tasks 3.1 and
3.2 ran in parallel per their assigned App.tsx line ranges, but both independently
extracted `cachedSheetData` state — the doc assigns it to Task 3.2
(`usePipelineOrchestration`) as localStorage-persisted, but Task 3.1's agent picked it up
too since it fell inside the "settings" line range (32-105) it was told to focus on,
and Task 3.2's agent, unaware 3.1 already had it, created a _second_, non-persisted
(`useState`, not `useLocalStorageState`) copy to satisfy its own effect — which would
have silently broken the "cached-sheet instant restore on reload" feature had it landed
unnoticed. Caught by reading both new hook files directly (not trusting either agent's
"build passing" self-report) before starting Task 3.4; fixed directly rather than
re-delegating: removed `cachedSheetData` from `useAppSettings.ts` entirely, and made
`usePipelineOrchestration.ts`'s copy `useLocalStorageState`-backed (matching the doc's
actual assignment). Confirmed via lint/build/test afterward. Worth flagging for future
phases: parallel tasks split by _line range_ rather than by _variable ownership_ can
double-extract state that appears in one task's range but is logically owned by
another's.

**Doc-consistency fixes made directly (not delegated), same practice as Phase 4's Task
33 gap):** `packages/app/CLAUDE.md`'s "Data flow", "Key modules", and "MVC mapping"
sections still described the pre-Phase-3 `App.tsx`-does-everything shape and the
now-deleted `appUtils.ts`/`rawInputUtils.ts` — rewritten to describe the
`hooks/app/*`-composition shape and the split util files. Added the missing
`hooks/app/index.ts` barrel export for `usePipelineOrchestration` (Task 3.3's agent had
only wired `useAppSettings`/`useVisualizerData` into the barrel).

**Final verification (independently re-run twice — once directly by the coordinator,
once by a `qa-reviewer` agent, per this repo's standing practice):**

- `npm run build -w packages/pipeline && npm run build -w packages/api && npm run build
-w packages/app`: all clean, 0 TypeScript errors
- `npm test -w packages/pipeline`: **157/157** (unchanged)
- `npm test -w packages/api`: **322/322** (unchanged)
- `npm test -w packages/app`: **76/76** (unchanged — Phase 3 is a pure refactor, no
  tests added/removed net; two test files were split/renamed —
  `rawInputUtils.test.ts` → `useResolvedRawInput.test.ts`, `appUtils.test.ts` →
  `sheetRef.test.ts` — but the 76 total is identical)
- `npx eslint packages/app packages/api`: clean
- `grep -rn "from '@dyel/pipeline'" packages/app/src`: exactly one file,
  `hooks/pipeline/usePipelineVariationRadarData.test.ts`
- Manual dev-server smoke: **DONE.** Human ran the state-plumbing checklist from
  `phase-3-app-decomposition.md`'s Verification section (`?sheet=`/`?mode=text&text=`
  overrides, cached-sheet instant restore on reload, refresh button, mode switching,
  default 3-month range, tab visibility vs. date range) against the dev server and
  confirmed it's fine. Phase 3 is now fully signed off.

PR #469 (Phase 3, → `app-refactor-phase-2`) and PR #468 (Phase 2, →
`migration-phase-1`) were both merged with `gh pr merge --merge` (merge commit, matching
this repo's existing merge-commit convention, not squash/rebase). Per explicit user
direction, Phases 1-3 were consolidated onto `migration-phase-1` (not `main` — PR #467,
Phase 1 → `main`, is still open) so Phase 4 could start without waiting on that final
merge. `origin/migration-phase-1` (`4623408`) diffs empty against Phase 3's tip
(`575d861`), confirming the merge chain carried everything forward losslessly. Both
`app-refactor-phase-2` and `app-refactor-phase-3` remote branches were auto-deleted by
GitHub on merge (`delete_branch_on_merge` is on for this repo, independent of the
`gh pr merge --delete-branch=false` flag used).

## App Refactor Migration — Phase 4: DONE (on `app-refactor-phase-4`)

New branch `app-refactor-phase-4` cut from `origin/migration-phase-1` (`4623408`, the
consolidated Phase 1-3 tip — see note above; not `main`, per user direction). Baseline
re-verified clean before starting: builds all clean, tests pipeline 157/157, api
322/322, app 76/76 — matches Phase 3's documented final state exactly.

All 9 tasks from `migration/phase-4-feature-restructure.md` landed as one commit each
(git mv only, zero logic change — every task independently verified via non-import-line
diff review against a pre-move baseline, not just build/test passing). Delegated to
`feature-implementer` agents, executed in dependency order rather than doc order (4.1,
then 4.7, then 4.2-4.6, then 4.8) since the feature dirs (4.2-4.6) needed `shared/charts/`
(4.7) to exist first for `charts.module.css` repointing:

- **4.1** — App.tsx(+css), PipelineContext(+test), the three `hooks/app/*` hooks, and
  `appTabs.ts` moved into new `src/app/`.
- **4.7** — Chart primitives (BaseRadarChart, DateLineChart, TooltipCard, colors.ts,
  CONVENTIONS.md) into `shared/charts/`; CollapsibleSection/ErrorBoundary/
  EditableDateChip/DateRangePicker into `shared/components/`; useCsvResource/
  useLocalStorageState into `shared/hooks/`; dateUtils.ts into `shared/`. Notably moved
  `charts.module.css` (a shared CSS module referenced by 8 different consumer
  `.module.css` files, not explicitly named in the phase doc's target tree) into
  `shared/charts/` and repointed all 8 consumers' `composes: ... from` paths — including
  5 consumers that hadn't physically moved yet at that point in the sequence, since
  their relative path to `shared/charts/` was still resolvable from their pre-move
  location.
- **4.2-4.6** — `features/data-source/`, `features/validation/`, `features/calculator/`,
  `features/sigma/` + `features/lift/`, `features/conjugate-info/` +
  `features/index-page/` populated per the doc's target tree. `main.tsx`'s `?page=`
  lazy-import paths and the `eslint.config.js` `no-restricted-imports` allowlist path
  (which points at `usePipelineVariationRadarData.test.ts`) updated as their owning
  files moved. `ConjugateInfoPage.tsx`'s `../../../CONJUGATE.md?raw` relative import
  verified unchanged — both its old and new locations sit 2 directories deep inside
  `src/`, so the depth to `packages/app/CONJUGATE.md` didn't change.
- **4.8** — `index.ts` barrels added to every `features/*/` and `shared/*/` dir (contents
  verified against each source file's actual exports, not assumed from the plan doc);
  the 8 old `components/*/CLAUDE.md`/`hooks/*/CLAUDE.md` docs redistributed into 11 new
  per-directory `CLAUDE.md` files matching the new feature boundaries; the now-fully-empty
  legacy `components/`, `hooks/`, `utils/`, `context/` directories deleted.
- **4.9** — sweep + final verification (below).

**Process notes:**

- A stray `packages/app/test-output.txt` was left behind by Task 4.4's implementer agent
  (redirected test output to a file instead of just running it — the exact anti-pattern
  already flagged in this doc's Phase 2 process notes). Caught via `git status --short`
  before committing, deleted, not staged. Every subsequent task prompt in this phase got
  an explicit "do not redirect command output to a file" instruction; no further
  occurrences.
- Every task's diff was independently re-verified (not just agent self-report) via
  `git status --short packages/app/src` (confirming only the assigned files changed —
  no scope creep across any of the 8 delegated tasks) plus a direct re-run of
  build/test/lint and a grep sweep for leftover old-path imports, before committing.
- Zero-logic-change claim independently spot-checked at Task 4.9 (not just assumed from
  "it's a file move"): diffed 5 representative moved files (`App.tsx`, `DiagnosticsPanel.tsx`,
  `usePipelineDiagnostics.ts`, `VariationRadarChart.tsx`, `dateUtils.ts`) against their
  `origin/migration-phase-1` pre-move content with import lines stripped out — all 5
  came back byte-identical outside their import blocks.
- `git log --follow` on `RepCalculator.tsx` and `App.tsx` both walk cleanly back through
  every prior rename/refactor to their original creation commits, confirming git's rename
  detection tracked every move in this phase correctly. Two small CSS files
  (`BaseRadarChart.module.css`, `DateLineChart.module.css`, moved in Task 4.7) fell below
  git's similarity threshold and recorded as delete+create rather than rename — cosmetic,
  doesn't affect correctness, just slightly weaker `git blame`/`--follow` on those two
  files specifically.
- The dev server (left running per this repo's convention at the start of this session)
  was found stopped partway through this phase — likely killed incidentally by one of
  the delegated agents' shell commands. Restarted before the final `?page=` route smoke
  check; all five routes (`/`, `?page=validator`, `?page=pipeline-validation`,
  `?page=conjugate`, `?page=index`) return 200 and serve the SPA shell correctly. This
  was an HTTP-level check only (curl), not a full interactive/console-error browser
  smoke test — no browser-automation tool was available this session. Each route's lazy
  chunk (`IndexPage`, `ConjugateInfoPage`, `PipelineValidationPage`, `ValidatorPage`)
  did build successfully in every `npm run build -w packages/app` run across all 9
  tasks, which is reasonable but not equivalent evidence that the module graph for each
  route is intact.

**Final verification (independently re-run twice — once directly by the coordinator,
once by a `qa-reviewer` agent, per this repo's standing practice):**

- `npm run build -w packages/pipeline && npm run build -w packages/api && npm run build
-w packages/app`: all clean, 0 TypeScript errors
- `npm test -w packages/pipeline`: **157/157** (unchanged)
- `npm test -w packages/api`: **322/322** (unchanged)
- `npm test -w packages/app`: **76/76** (unchanged — pure file-move phase, no tests
  added/removed/renamed net)
- `npx eslint packages/app packages/api`: clean
- `grep -rn "from '@dyel/pipeline'" packages/app/src`: exactly one file,
  `features/lift/usePipelineVariationRadarData.test.ts` (moved from its old
  `hooks/pipeline/` location, same single documented exception as every prior phase)
- `find packages/app/src/components packages/app/src/hooks packages/app/src/utils
packages/app/src/context`: all four report "No such file or directory" — legacy dirs
  fully deleted
- `git status --short`: clean working tree, everything committed
- `?page=` route smoke (HTTP-level, see process notes above): all 5 routes return 200

Not yet done: PR opened to `main` for this phase (per `migration/README.md`'s per-phase
checklist item 5) — pending user direction on target branch, since Phase 1's PR #467 to
`main` is still open and this phase stacks on `migration-phase-1` rather than `main`,
same situation as Phases 2/3 before their consolidation.

## App Refactor Migration — Phase 5: DONE (on `app-refactor-phase-5`) — migration complete

New branch `app-refactor-phase-5` cut from `app-refactor-phase-4` (`516e6c7`, since Phase
4's PR to `main` hadn't landed yet — same stacking pattern as every prior phase in this
migration). Baseline re-verified clean before starting: builds all clean, tests pipeline
157/157, api 322/322, app 76/76 — matches Phase 4's documented final state exactly.

All 5 tasks from `migration/phase-5-enforcement-docs.md` landed. This is the last phase of
the App Refactor migration — machine-enforcing the unidirectional-flow rules the prior four
phases built, and rewriting the docs so the architecture is followed by default rather than
by convention alone.

**Pre-delegation audits caught two real gaps the phase doc didn't anticipate** (same
practice as every prior phase — a fresh grep sweep before trusting the doc's assumptions):

- **Task 5.1's real scope was bigger than "add an ESLint rule."** The doc assumed only
  `shared/charts/**` needed a display-helper exception. A `grep -rn "from '@dyel/api'"
packages/app/src/**/*.tsx` found 6 components still calling `@dyel/api` derivation
  functions directly instead of via a hook — a Phase 2 leftover (`SigmaChart` →
  `latestLiftE1RMs`, `VariationRadarChart` → `buildRadarRows`, `StrengthScoreCalculator` →
  `strengthTierForPercentile`, `RepCalculator` → `convertE1RMToDisplayUnit`,
  `PipelineValidationPage` → `classifyPipelineVerdict`, `DiagnosticsPanel` →
  `summarizeEffects`). Relocated all 6 into their owning feature hooks (zero behavior
  change) before adding the lint rule, then allowlisted 7 files for genuinely display-only
  imports (formatters/constants, not derivation) with an explanatory comment each — matching
  the phase doc's own "allowlist explicitly rather than weaken the rule" guidance.
- **Task 5.2 found 5 existing cross-feature imports that bypassed the target feature's
  barrel** (`SheetUrlPanel.tsx` → `../index-page/useIndexData`, two `features/lift/*`
  files → `../sigma/usePipelineDatasets`, two `features/validation/*` files →
  `../data-source/{sheetRef,sheetFetch,rawInput}`). Fixed all 5 to import via the barrel —
  pure import-path swaps, every export was already barrel-exported.

**Two real regressions caught during independent re-verification (not just agent
self-report), both from Task 5.2's barrel-import fixes, fixed directly by the
coordinator:**

1. Barrel-importing `usePipelineDatasets` via `../sigma` in `features/lift/`'s two hooks
   pulled `SigmaChart.tsx`/`TotalChart.tsx`/`SessionBarChart.tsx` (and therefore `recharts`)
   into `usePipelineVariationRadarData.test.ts`'s module graph, and `recharts`' CJS build
   has a broken transitive dependency on `@reduxjs/toolkit`'s ESM-only dist that Vitest
   can't parse — the whole suite failed to load (`app` test count silently dropped 77→67,
   one file failing to even collect). A `vitest.config.ts`-level `deps.inline` fix was
   tried first and did **not** work (same error persisted through several variations); the
   actual fix was `vi.mock('recharts', () => ({}))` at the top of that one test file,
   since it never renders any chart component — reverted the `vitest.config.ts` change
   once the targeted mock worked. Caught only because the coordinator re-ran
   `npm test -w packages/app` directly instead of trusting the agent's "unchanged" claim
   (which was flatly wrong — 67 ≠ 77).
2. Barrel-importing `useIndexData` via `../index-page` in the always-eagerly-loaded
   `SheetUrlPanel.tsx` statically pulled the `IndexPage` page component into it — `main.tsx`
   lazy-loads `IndexPage` for code-splitting, so this silently defeated that split (Vite's
   build emitted an `INEFFECTIVE_DYNAMIC_IMPORT` warning that the delegated agent's report
   didn't mention checking for). Fixed by reverting `SheetUrlPanel.tsx` to its original deep
   import with an explanatory comment, and adding a matching one-file ESLint allowlist
   override — the same "documented exception" pattern used throughout this migration when a
   blanket rule conflicts with a real, legitimate constraint.

**Task 5.4's agent self-report was also caught as inaccurate**, same "verify, don't trust"
practice as every prior phase: it claimed to add a `papaparse` dependency note to
`packages/api/CLAUDE.md`, but `git status`/`git diff` showed the file completely
unmodified — the edit was never actually written. Added the missing section directly
after confirming (independently) that the export table itself genuinely was already
complete (every `packages/api/src/index.ts` export has a matching table row — no rows
were actually missing, contrary to nothing needing fixing there).

**Task 5.3** (rewriting `packages/app/CLAUDE.md`'s MVC section into a "Data flow contract"
section) landed cleanly; the only fix made directly was removing hardcoded `eslint.config.js`
line-number references the agent added (e.g. "lines 90–138") — these drift immediately on
any unrelated edit to that file, so replaced with descriptions of which rule block to look
for instead.

**Root `CLAUDE.md` was also found stale** (Task 5.5, this section) beyond what the phase
doc anticipated ("update if it references paths that moved") — its "Workspace Architecture"
section predated the `@dyel/api` package's existence entirely: it listed a nonexistent
`@dyel/app` package name (the actual npm package name is `dyel-visualizer`, no scoped
alias) and never mentioned `@dyel/api` at all, and "Strict Importing Rules" said nothing
about the sole-boundary rule this entire migration exists to enforce. Rewrote both sections
to name all three packages accurately and state the actual enforced rules (sole-boundary,
component render-only, feature-barrel-only), pointing at `eslint.config.js` and each
package's own `CLAUDE.md` as the source of truth rather than duplicating specifics that
will drift.

**Final verification (independently re-run by the coordinator, not just agent-reported,
per this repo's standing practice across all 5 phases):**

- `npm run build -w packages/pipeline && npm run build -w packages/api && npm run build
-w packages/app`: all clean, 0 TypeScript errors
- `npm test -w packages/pipeline`: **157/157** (unchanged)
- `npm test -w packages/api`: **322/322** (unchanged)
- `npm test -w packages/app`: **77/77** (up from the Phase 4 baseline of 76 — +1 from a
  hook-relocation test gaining coverage in Task 5.1, not a deletion)
- `npx eslint packages/app packages/api`: clean
- `grep -rn "from '@dyel/pipeline'" packages/app/src` (excluding `.test.` files): zero
  hits — even the one previously-documented test-only exception
  (`features/lift/usePipelineVariationRadarData.test.ts`) is excluded by that filter, i.e.
  it's still the _only_ file in `packages/app/src` importing `@dyel/pipeline` at all
- Both deliberate-violation checks performed and reverted: a component-level
  `@dyel/api` value import in a non-allowlisted file (`TotalChart.tsx`) fails lint; a
  deep cross-feature import (`../sigma/SigmaChart` from `features/lift/`) fails lint
- `git status --short`: clean working tree at time of this write-up
- `?page=` route smoke (HTTP-level only, via the already-running dev server — no
  browser-automation tool available this session, same caveat as Phase 4's check): all 5
  routes (`/`, `?page=validator`, `?page=pipeline-validation`, `?page=conjugate`,
  `?page=index`) return 200. Given this phase's changes are lint/docs plus zero-behavior-
  change hook relocations (already covered by the unchanged/incremented test suite above),
  this HTTP-level check plus the full build/test/lint regression is treated as sufficient
  sign-off; dev server left running at localhost:5173 per this repo's convention.

**Test-count delta for the whole App Refactor migration (Phases 1-5, against the
migration-start baselines recorded in `migration/README.md`):** pipeline 157→157
(unchanged — this migration never touched `packages/pipeline` except Task 36 of the prior
`@dyel/api` migration, already reflected in the 157 baseline), api 125→322 (+197, all in
Phase 1), app 133→77 (−56, net across Phases 1-2's dedup/deletion work plus Phase 5's +1).

Not yet done: PR opened to `main` for this phase — same situation as every prior phase in
this migration, pending user direction on target branch/consolidation strategy since none
of Phases 1-4's PRs to `main` have merged yet.

`migration/README.md`'s per-phase checklist item 5 offered "optionally delete `migration/`
or mark it done." Chose **mark done, don't delete** — consistent with the more cautious
precedent set for the `@dyel/api` migration's own `API_PHASE_1.md`–`API_PHASE_4.md` docs
(explicitly deferred rather than deleted, to preserve the audit trail). `migration/README.md`
and `migration/phase-1-api-additions.md` through `migration/phase-5-enforcement-docs.md` are
now candidates for deletion in a future deliberate cleanup pass, once this phase's PR
actually lands on `main` and the whole migration is confirmed stable in production use — not
bundled into this update.

## Next

The `@dyel/api`-as-sole-boundary migration (its own separate, earlier 4-phase migration)
and the App Refactor migration (feature organization + unidirectional data flow, Phases
1-5, see above) are both now complete in the working tree on `app-refactor-phase-5`,
pending only PRs landing on `main`. One smaller follow-up item was deferred out of the
`@dyel/api`-as-sole-boundary migration's scope (recorded here per Phase 4's Task 35, not
yet started):

1. **`LiftType` dedupe:** `@dyel/api` independently defines a `LiftType` literal type
   rather than re-exporting `@dyel/pipeline`'s structurally identical one (flagged in
   `API_PHASE_2.md` Task 15). Reconciling this is a separate, smaller cleanup — a
   silent type dedupe risks import-order/circularity surprises better handled as its
   own reviewable diff.

(The second deferred item that used to be listed here — an ESLint `no-restricted-imports`
rule scoped to `packages/app/src` banning `@dyel/pipeline` imports — was actually already
in place before this note was written, just with a wider allowlist; the App Refactor
migration's Phase 3 (above) shrank that allowlist from 3 files down to 1, closing this
out.)

Per `API_PHASE_4.md`'s own closing note, `API_PHASE_1.md` through `API_PHASE_4.md`
themselves are candidates for deletion now that their content is fully reflected in
reality and in this file — but that's left to a deliberate follow-up pass, not bundled
into this update, so the audit trail of what was done and why isn't lost immediately
after being written.

## Verification commands (reference)

```bash
npm run build -w packages/pipeline && npm run build -w packages/api && npm run build -w packages/app
npm test -w packages/pipeline && npm test -w packages/api && npm test -w packages/app
```

## CODE_REVIEW.md remediation — IN PROGRESS (still on `migration-phase-1`)

New effort, separate from the App Refactor / `@dyel/api`-boundary migrations above: fixing
the 11 confirmed findings in `CODE_REVIEW.md` (review of PR #470, this same branch). Full
finding detail/line citations live in `CODE_REVIEW.md`; this section tracks execution only.

**Pre-delegation verification (Explore agent, cross-checked against `CODE_REVIEW.md`'s own
citations):** all 11 findings' file/line citations confirmed against current source, with two
corrections to the review's own citations noted for delegation accuracy:

- Finding 2 (speed-work fallback): `fitNormalizationModel` itself starts at `normalize.ts:87`,
  not 154 — 154 is inside its per-family baseline cascade (lines 143-154). Fallback fix likely
  belongs inside `fitNormalizationModel`, not the `pipeline.ts:101` prefilter.
- Finding 5 (UTC date bug): the correct local-date pattern to mirror is
  `packages/api/src/chart/pipelineChartUtils.ts:62-68` (`localDateKey`), not
  `utils/pipelineChartUtils.ts` — that path doesn't exist.
- Finding 3 (validator): `headerRow: 0` is hardcoded in the early-`error`-return path at line
  102, not inside the 123-141 range itself — worth flagging to whichever agent takes Task B3.

**Priority tiers** (see full task list below, same content mirrored from the plan):

- **P0 (Phase A):** silent data corruption / easy to hit in normal use — CSV reps NaN guard,
  session-date UTC shift, `collectSessionDates` maxEffort-only gap, committed build artifact,
  `KG_TO_LBS` triplication. All touch disjoint files — dispatched in parallel.
- **P1 (Phase B):** real correctness/architecture bugs with larger blast radius — composite
  chart carry-forward/date-range order, normalization speed-work fallback, sheet validator
  per-row checks, cross-feature barrel evasion + ESLint widening. Sequential, reviewed closely.
- **P2 (Phase C):** perf cleanup only, no correctness impact — pipeline hot-path
  recomputation, `conjugateBestSet` reduce.
- **Out of scope:** Finding 4 (Schwartz-Malone typo) predates this branch's merge-base — file
  as a separate GitHub issue, not fixed here. Lower-priority notes section not actioned yet.

### Phase A — P0 fixes — DONE, independently verified

- [x] Task A1: CSV reps NaN guard — `parseInt(repsStr, 10)` + `isNaN` guard throwing `ParseError`,
      matching the `weight` field's existing pattern. `csv.ts:73`. 4 new `it.each` error-case tests
      added. Verified: `npm run build -w packages/pipeline` clean, 6/6 tests pass.
- [x] Task A2: Session date UTC shift fix — replaced `toISOString().split('T')[0]` with an inline
      local-date formatter (`getFullYear`/`getMonth`/`getDate`) in `lastSessionDetail.ts:36-39`.
      Test dates switched from UTC-midnight-parsing `new Date('2026-01-15')` to local
      `new Date(2026, 0, 15)`, plus a new dedicated timezone regression test. Verified:
      `npm run build -w packages/api` clean, 9/9 tests pass. **Follow-up noted, not blocking:**
      this inlines the same local-date-string logic a third time rather than exporting/reusing
      `localDateKey` from `pipelineChartUtils.ts` (which isn't currently exported) — same
      duplication pattern already flagged as a lower-priority note in `CODE_REVIEW.md`. Small
      future cleanup: export `localDateKey`, repoint both `lastSessionDetail.ts` and
      `volume/volume.ts`'s hand-rolled copy at it.
- [x] Task A3: `collectSessionDates` now spreads both `.maxEffort` and `.volume` per lift
      (`modelSelectors.ts:23-26`), mirroring sibling `collectVolumeRecords`'s access pattern. New
      test covers a volume-only day becoming `lastSessionDate`. Verified: `npm run build -w
    packages/api` clean, 20/20 tests pass.
- [x] Task A4: `packages/pipeline/tsconfig.tsbuildinfo` removed from git (`git rm`), `*.tsbuildinfo`
      added to root `.gitignore`. Verified: rebuild regenerates the file locally but it stays
      untracked (`git status --short` confirms).
- [x] Task A5: `KG_TO_LBS` exported from `weightUnit.ts` as the single source of truth;
      `getCompetitionTotal.ts` now calls `roundWeight` directly (was a verbatim reimplementation);
      `volume.ts` now calls `convertWeight`; `strengthScores.ts`'s `convertUnits` now derives the
      lbs→kg direction as `v / KG_TO_LBS` instead of hardcoding the inverse constant. Verified:
      `npm run build -w packages/api` clean, full package suite 284/284 (was 282 baseline + 2 new
      tests from A2/A3, confirming no regressions).

**Phase A cross-package regression (independently re-run by coordinator after all 5 tasks landed):**
`npm run build -w packages/pipeline && npm run build -w packages/api && npm run build -w
packages/app` — all clean, 0 TypeScript errors. Baseline test counts on this branch
(`migration-phase-1`, pre-fix, confirmed via `git stash`) were pipeline 71, api 282, app 40 — much
lower than the App Refactor migration's documented Phase 1-5 numbers above, confirming those later
phases live on unmerged stacked branches and are **not** part of this branch's current state; this
is the correct baseline for `CODE_REVIEW.md`'s findings, which were reviewed against this same
branch. Post-Phase-A: pipeline 71/71 (unchanged), api 284/284 (+2, expected), app not yet touched
by Phase A (all 5 tasks were pipeline/api-only).

### Phase B — P1 fixes — DONE, independently verified

- [x] Task B1: Composite branch in `buildDataset` (`packages/pipeline/src/dataset/build.ts`) now
      builds per-component grids and runs carry-forward over full unfiltered `points` (not
      `scoped`), and applies `ui.dateRange` filtering to the final `rows` only, after
      carry-forward/sum/post-transform — matching the documented CompositeSpec contract. `series`
      branch left untouched (no carry-forward, pre-filter is semantically equivalent there). 4 new
      test cases added, including the exact December-bench/January-squat bug scenario from
      `CODE_REVIEW.md`. Manually hand-traced by the coordinator against both the new and a
      pre-existing test case to confirm correctness before trusting. Verified: build clean, full
      pipeline suite 75/75 → **77/77** after B2's own additions (see below).
- [x] Task B2: `fitNormalizationModel` (`packages/pipeline/src/derive/normalize.ts`) now builds a
      `byCanFitted` view — each canonical's records filtered to non-speed-work sets via the
      already-exported `isSpeedWork` from `derivers.ts`, falling back to the canonical's full
      record set if it has zero effort sets (mirrors `derivers.ts`'s own `e1rm` deriver's
      `effortSets.length ? effortSets : sets` fallback pattern exactly). All grid-building/fit call
      sites (baseline grid, straight-canonical grid, addlWt offset fit, variant factor fit) switched
      to this view. `pipeline.ts`'s global `fitInput` prefilter (which unconditionally dropped every
      speed-work set pipeline-wide, with no per-canonical fallback) removed entirely —
      `fitNormalizationModel` now receives the full unfiltered `tagged` history and does its own
      per-canonical filtering internally. 2 new tests (100%-speed-work canonical gets a factor via
      fallback; mixed canonical uses only its effort sets, verified with a concrete numeric
      assertion). Verified: build clean, full pipeline suite **77/77**.
- [x] Task B3: `validateSheetCsv`'s per-row loop (`packages/api/src/validation/pipelineSheetValidator.ts`)
      restored to the deleted `packages/core` predecessor's exact validation surface (weight
      missing/non-numeric = problem; reps missing = warning, non-integer/`<=0` = problem; date
      missing = warning, unparseable = problem; RPE out of 1-10 = warning) — traced against the
      original `validateRow.ts`/`validateSheetCsv.ts` (commit `56fbe5c^`) to confirm exact severity
      split and message text, adapted to the current file's `findH()`-based header resolution
      instead of the deleted core package's `RawRow`/`findCol`. `headerRow: 0` hardcoding
      deliberately left untouched (separate, lower-priority gap, not part of this fix). 1 new test
      covering all 6 field-level cases independently (missing/invalid weight, reps, date, RPE).
      Verified: build clean, full api suite **285/285**.
- [x] Task B4: 5 deep cross-feature imports (4 originally flagged + 1 more the implementer found in
      `usePipelineVariationRadarData.test.ts`, all using the `../../features/<name>/*` evasion form)
      repointed to their feature's barrel across
      `features/validation/{ValidatorPage,PipelineValidationPage}.tsx`,
      `features/index-page/useIndexData.ts`, `features/lift/usePipelineVariationRadarData.test.ts`.
      `eslint.config.js`'s feature-barrel `no-restricted-imports` block widened with 7 new
      `../../features/<name>/*` pattern entries alongside the existing `../<name>/*` ones — the
      `SheetUrlPanel.tsx` allowlist exception (intentional, documented lazy-loading reason) verified
      unaffected. **Independently re-verified the widened rule actually works** (not just trusted
      the agent's claim): reintroduced a scratch `../../features/data-source/sheetFetch` import,
      confirmed `npm run lint -w packages/app` flags it, reverted before finishing. Verified: lint
      clean, build clean, app suite **40/40** (unchanged, pure import-path swap).

**Phase B cross-package regression (independently re-run by coordinator after all 4 tasks landed):**
builds all clean (pipeline/api/app), `npx eslint packages/app packages/api` clean. Tests: pipeline
**77/77** (was 71 baseline, +6 from B1+B2), api **285/285** (was 282 baseline, +2 A2/A3 +1 B3), app
**40/40** (unchanged).

### Phase C — P2 cleanup (perf, do last) — DONE, independently verified

- [x] Task C1: `packages/pipeline/src/pipeline.ts` now hoists `offsetAdjustRecords(tagged, model)`
      to run once (was once per deriver id, ~4+ redundant O(records) passes) and splits the
      `Map.groupBy` grouping (by `${date}::${canonical}` and `${date}::${label}`) into standalone
      `groupByDateAndCanonical`/`groupByDateAndLabel` helpers computed once each and reused across
      all 4 `pointsBy*` builders via new `buildPointsFromGroups`/`buildPointsByLabelFromGroups`
      helpers that take pre-grouped data — eliminating the previous once-per-deriver-id grouping
      passes entirely. `conjugateBestSet.ts`'s `reduce` now precomputes each record's e1RM once
      (`effortSets.map(r => ({ r, e1rm: calcE1RM(...) }))`) instead of recomputing the accumulator's
      e1RM every iteration; tie-break semantics (prefer earlier element on equality) preserved
      exactly. **Coordinator found and removed dead code the implementer left behind:** the old
      `buildPoints`/`buildPointsByLabel` wrapper functions became unused after the refactor (nothing
      in the file called them anymore, just thin pass-throughs to the new `*FromGroups` helpers) —
      not caught by `tsc` (no `noUnusedLocals`) or lint (pipeline package isn't in the monorepo's
      `eslint packages/app packages/api` scope), only caught by directly reading the diff. Removed
      directly rather than re-delegating. Verified: build clean, pipeline 77/77 and api 285/285
      unchanged before AND after the dead-code removal, confirming zero behavior change throughout.

**Phase C cross-package regression (independently re-run by coordinator):** builds all clean
(pipeline/api/app), tests unchanged (pipeline 77/77, api 285/285, app 40/40), `npx eslint
packages/app packages/api` clean, `git status --short` confirms the full diff touches exactly the
files each of the 10 tasks (A1-A5, B1-B4, C1) was assigned — no scope creep across the whole effort.

### Out of scope / file separately

- Finding 4 (Schwartz-Malone female coefficient typo at bodyweight 237, `strengthScores.ts:339`) —
  pre-existing bug, predates this branch's merge-base. File as a new GitHub issue, not part of
  this remediation.
- Lower-priority notes (duplicated date helpers, ESLint carve-out growth, dead barrel exports,
  redundant field pair, hardcoded special cases, diagnostics semantics question) — noted in
  `CODE_REVIEW.md`, not blocking; revisit after Phases A-C land.

**Status: ALL 10 TASKS DONE (A1-A5, B1-B4, C1), independently verified.** Remaining, not yet
started:

1. **File a GitHub issue for Finding 4** (Schwartz-Malone female coefficient typo,
   `strengthScores.ts:339`, bodyweight-237 entry `0.5765` breaks the strictly-decreasing table
   trend) — pre-existing, predates this branch, deliberately not fixed here. `gh issue create`
   has known problems on this repo per user's standing memory (Projects-classic-deprecation
   breakage) — use the `gh api` workaround, not the plain CLI form.
2. **Lower-priority notes not actioned:** duplicated date helpers (now a THIRD copy after Task
   A2's inline local-date formatter — see A2's note above; export `localDateKey` from
   `pipelineChartUtils.ts` and repoint both `lastSessionDetail.ts` and `volume/volume.ts`'s
   existing hand-rolled copy at it), ESLint carve-out growth (render-only allowlist could become
   a structural `@dyel/api/display` subpath export instead of a maintained per-file list), dead
   barrel exports (`selectBestE1RMPoint`/`mergeWideRechartsRows`/`facetFamilyKey`), a redundant
   `baselineCanonicals`/`targetCanonicals` field pair in `useVisualizerData.ts`, hardcoded
   deadlift-stance/equipment-magnitude special cases (overstated in the review, not a clean
   drop-in fix), and a diagnostics semantics question likely intentional (documented in
   `analyze/CLAUDE.md`) — none blocking, not part of this remediation pass.
3. **Not yet committed.** Everything above (Tasks A1-A5, B1-B4, C1) is sitting uncommitted in the
   working tree, same as this branch's other in-flight migration work. Per this repo's git
   conventions (root `CLAUDE.md`): never commit directly to `main` (N/A here, already on a feature
   branch), submit as a new PR referencing the source issue once ready. Awaiting user direction on
   whether to commit as one combined change or split by phase/priority tier, and which branch/PR
   this should target given `migration-phase-1`'s own PR #467 status.
