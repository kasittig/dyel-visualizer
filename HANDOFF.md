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

## App Refactor Migration — Phase 4: IN PROGRESS (on `app-refactor-phase-4`)

New branch `app-refactor-phase-4` cut from `origin/migration-phase-1` (`4623408`, the
consolidated Phase 1-3 tip — see note above; not `main`, per user direction). Baseline
re-verified clean before starting: builds all clean, tests pipeline 157/157, api
322/322, app 76/76 — matches Phase 3's documented final state exactly.

Working from `migration/phase-4-feature-restructure.md` (file moves only, zero logic
change, tasks 4.1-4.9 restructuring `packages/app/src` into `app/`, `features/*/`,
`shared/` per the target tree in that doc).

## Next

The `@dyel/api`-as-sole-boundary migration is complete. One smaller follow-up item was
deferred out of this migration's scope (recorded here per Phase 4's Task 35, not yet
started):

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
