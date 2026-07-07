# HANDOFF.md — TotalChart Core-vs-Pipeline Parity Testing

## Status: Session 6 — ConjugateCharts revert IMPLEMENTED and verified (branch target: current branch)

Session 6 planning produced a full task breakdown to revert `ConjugateCharts` from `@dyel/pipeline`
back to `@dyel/core`, mirroring `TotalChart`'s already-reverted state. The user resolved the one open
branch-target question (**current branch, `integrate-new-pipeline`**, not `migration-phase-1`) and
all 7 tasks were then executed via `feature-implementer`/`qa-reviewer` in the same session. See
"Session 6: Implementation" below for what landed, ground-truth verification numbers, and a new
finding (variation-label-space mismatch) surfaced by the new parity harness.

**Session 4.5 note (still accurate):** all of Session 3's and Session 4's work had accumulated as
uncommitted working-tree changes (nothing had actually been committed since `c3d4887`). It was split
into 3 logical, independently-buildable commits on `integrate-new-pipeline`:

1. `Refactor compareChartSeries.test.ts to matrix/factory test style` — unrelated test-style cleanup.
2. `Add athlete deadliftStance preference and stance-aware baseline priority` — Session 3 plumbing
   (`AthleteContext.deadliftStance`, `runPipeline`/`fitNormalizationModel` threading) + Session 4's
   pool-priority reorder in `normalize.ts`, bundled together since the required-field addition can't
   be split without breaking intermediate builds.
3. `Promote deadlift baseline identity to a hard parity assertion` — the `compareBaselineIdentity`
   bare-canonical fallback fix + `diffChartSeries.test.ts` corrections + the hard-assert promotion in
   `totalChartParity.test.ts`.

A pre-existing, unrelated `TODO.md` deletion was found in the working tree (not part of Sessions 3/4)
and was **pulled in and committed as part of Session 6's `git pull`** (see "Session 6: Implementation"
below) — it turned out to already exist upstream as commit `c637206`, not a local-only stray change.
`files/` (DESIGN.md, ISSUE_PROMPT.md, create_issues.sh, dated Jul 4) and stray `test-output.txt`/
`test_output.txt` logs were likewise left out of any commit as out-of-scope scratch.

---

## Goal (unchanged across sessions)

Add a live **core-vs-pipeline diff** to `totalChartParity.test.ts` (as an explicit, scoped
exception to the pipeline migration boundary rule), comparing the legacy `@dyel/core` TotalChart
data computation against the new `@dyel/pipeline` implementation to catch behavioral divergence
before production — and, as that harness matured, use it to find and close real gaps between the
two implementations rather than just document them. Session 6 extends this same philosophy to the
`ConjugateCharts` revert: keep a parity harness alive across the revert instead of just deleting the
pipeline path outright.

---

## Session 6: Implementation

### Branch-target decision (resolved)

User chose **current branch (`integrate-new-pipeline`)**, not `migration-phase-1`. The two extra
items flagged for the `migration-phase-1` option (LINE_COLORS import revert, parity-test/doc
cleanup for `c42d62d`) do not apply — the plan's base 7-task breakdown was executed as-is.

### Task 0 (added ahead of the plan's Task 1) — working-tree/branch cleanup

Investigation found the working tree's uncommitted diff (`App.tsx`, `SigmaTab.tsx`,
`packages/pipeline/src/tag/detect/canonical.ts`, `packages/pipeline/src/tag/detect/parseExercise.ts`,
and the `TODO.md` deletion) was **byte-identical** to two commits already sitting on
`origin/integrate-new-pipeline` (`c637206` "Revert UI to legacy backend pending bugfixes" and
`8001486` "Fix CodeQL polynomial-redos alerts") — the local branch was simply 2 commits behind and
had never pulled. Stashed the working tree, fast-forward merged to `origin/integrate-new-pipeline`,
then popped the stash (only the unrelated `HANDOFF.md` edit remained). Note: `origin`'s
`integrate-new-pipeline` ref itself has since been deleted upstream (the branch was already merged
via PR #454 and cleaned up), but the locally-cached remote-tracking ref still had the two commits'
objects, so the fast-forward worked without a live remote fetch.

### Tasks 1-5 — sequential revert (`feature-implementer`, one dispatch per file)

Each task's target end-state was the exact pre-migration file content from git blob
`9ac016e^:<path>` (the commit right before "Migrate TotalChart and ConjugateCharts to
@dyel/pipeline"), used verbatim rather than re-derived:

1. **`useConjugateChartData.ts`** — reverted to a thin `useMemo` wrapper around `@dyel/core`'s
   `buildVariationChartData(rows, baselineNames, stats, targetName)`; re-exports `NORMALIZED_KEY`
   from `@dyel/core` (`'__normalized__'`) instead of a local `'normalized'` constant.
2. **`ConjugateCharts.tsx`** — reverted props to `{ rows, baselineNames, stats, targetName,
onTargetChange, highlightedVariation?, onVariationClick? }`; restored the "Competition variation"
   `<select>` dropdown (shown when `baselineExercise` is present) and the `sets×reps @ weight · RPE`
   tooltip detail line (via `bestSetByLabelAndDate`).
3. **`LiftTabPanel.tsx`** — now feeds `ConjugateCharts` from its already-local `filteredRows`/
   `effectiveBaselineNames`/`stats`/`targetName`, plus a new required `onTargetChange` prop; dropped
   `inputMode`/`url`/`pastedText`/`refreshToken`/`unit` (no longer needed to forward).
4. **`App.tsx`** — restored `onTargetChange` → `setTabState` wiring at the `<LiftTabPanel>` call
   site; stopped forwarding `inputMode`/`url`/`pastedText`/`refreshToken`/`unit` there (still used
   elsewhere in the file for `SheetUrlPanel`/`RepCalculator`/etc., untouched).
5. **`conjugateChartSpecs.ts`** — confirmed via `grep -rln conjugateChartSpecs packages/app/src` to
   have zero remaining production importers (only itself); kept as parity-test-only infrastructure,
   same treatment `totalChartSpecs.ts` gets.

Each task's `feature-implementer` build-verified incrementally (`npm run build -w packages/app`),
confirming errors were scoped only to not-yet-reverted downstream consumers at each step, ending in
a fully green build after Task 4.

### Task 6 — new regression harness: `conjugateChartParity.test.ts`

Mirrors `totalChartParity.test.ts`'s structure (single `beforeAll`, hard-assert/soft-warn split,
same `total-chart-sheet.csv` fixture), adapted for `ConjugateCharts`' per-lift-type
`variations: string[]` axis instead of `TotalChart`'s fixed lift-id set. Outer loop over
squat/bench/deadlift; inner comparison over variation names present in **both** the legacy
`buildVariationChartData(...).variations` axis and the pipeline `conjugateChartSpecs`-driven
output's column keys, diffed via the existing `testUtils/diffChartSeries.ts`
(`joinChartPointsByDate` + `diffSeries`). `conjugateChartSpecs.ts` is now this test's only importer.

**Result:** 8/8 tests passing.

**New finding (not previously anticipated in the Session 6 plan):** the per-variation intersection
is **empty for all three lift types** on the real fixture — legacy variation labels are
free-form logged display names (e.g. `"Bench (1 board)"`, `"Deadlift (2" deficit, opposite)"`,
`"Belt Squat (narrow stance)"`), while pipeline variation labels are canonical slugs (e.g.
`"bench-american"`, `"deadlift-opposite"`, `"squat-box"`) — a much coarser, differently-named axis.
Zero legacy display names ever match a pipeline canonical string, so the per-variation hard-assert
(`comparedCount > 0`) never actually exercises live data; the harness instead soft-warns
`"no matched variations between implementations"` for every lift type, and separately soft-warns
`"no date overlap"` for the `normalized` series despite both sides having non-trivial point counts
(squat: legacy 4 / pipeline 13; bench: legacy 22 / pipeline 22; deadlift: legacy 12 / pipeline 19).
This is a **real, previously-undocumented gap** — broader than the already-tracked
"canonical-grouping differences" in Open item #4 below, since it means the two implementations don't
even share a common variation-naming vocabulary at the per-exercise-variant level, only at the
lift-family level (`squat`/`bench`/`deadlift`). Logged as a new open item (#7 below) rather than
silently accepted, since the harness's intersection-based join strategy currently can't catch
_any_ real per-variation divergence until this is addressed (e.g. by mapping legacy display names to
pipeline canonical slugs before joining, or comparing structurally instead of by label).

### Task 7 — full verification (`qa-reviewer`)

Ground-truth results, directly reported by the QA agent from live command output:

```
npm test -w packages/app         → 113 passed, 10 test files, exit 0 (includes 8 new conjugateChartParity tests)
npm run build -w packages/app    → exit 0
npm run build -w packages/pipeline → exit 0
npm test -w packages/pipeline    → 178 passed, 12 test files, exit 0 (unaffected, sanity-checked)
grep -rn "runPipeline\|@dyel/pipeline" packages/app/src/hooks/conjugate packages/app/src/components/conjugate
                                  → no matches (pipeline-migration boundary fully reverted for these dirs)
```

`git diff --stat` for the revert itself (excluding the unrelated `HANDOFF.md` edit):

```
 packages/app/src/App.tsx                                    |  11 +-
 packages/app/src/components/conjugate/ConjugateCharts.tsx    |  69 ++++++----
 packages/app/src/components/pages/LiftTabPanel.tsx           |  24 +---
 packages/app/src/hooks/conjugate/useConjugateChartData.ts    | 114 ++---------------
 4 files changed, 88 insertions(+), 130 deletions(-)
 + packages/app/src/pipeline/conjugateChartParity.test.ts (new, untracked)
```

### Files touched (Session 6)

- `packages/app/src/hooks/conjugate/useConjugateChartData.ts` — reverted to `@dyel/core` wrapper
- `packages/app/src/components/conjugate/ConjugateCharts.tsx` — reverted props/JSX, restored
  dropdown + tooltip detail line
- `packages/app/src/components/pages/LiftTabPanel.tsx` — reverted `ConjugateCharts` wiring
- `packages/app/src/App.tsx` — restored `onTargetChange` wiring at the `LiftTabPanel` call site
- `packages/app/src/pipeline/conjugateChartParity.test.ts` — new, 8 tests
- (Task 0, not part of the plan's original scope) fast-forwarded `integrate-new-pipeline` to pull in
  already-upstream commits `c637206`/`8001486` (App.tsx/SigmaTab.tsx UI revert + CodeQL ReDoS fixes
  - `TODO.md` deletion), clearing the stale local-branch state

**Not committed yet** — all Session 6 changes are currently uncommitted working-tree state (plus the
pulled `c637206`/`8001486` commits, which are now part of local history). Splitting into logical
commits and opening a PR is still pending (see "Next Steps").

---

## Session 6: Findings (branch discovery + revert scope, from planning)

- **`ConjugateCharts` was migrated to `@dyel/pipeline` in the same commit as `TotalChart`**
  (`9ac016e`, "Migrate TotalChart and ConjugateCharts to @dyel/pipeline").
- **A real `migration-phase-1` branch exists** (local + remote) that is _not_ a revert continuation
  — it's the opposite direction, moving `ConjugateCharts` further onto pipeline. **Not used** — the
  branch-target decision landed on the current branch instead (see "Session 6: Implementation"
  above). Left as reference context in case a future session revisits that branch.
- **Pre-migration code restored, unchanged, from `@dyel/core`:**
  `packages/core/src/load/buildVariationChartData.ts` — produced exactly the shape `ConjugateCharts`
  needed; the revert was a straight restoration, not new design work. Also brought back two UX
  features the pipeline version had dropped: the "Competition variation" dropdown and the
  sets/reps/RPE detail line in the chart tooltip.

---

## Session 1-3 summary (prior work, still accurate)

- **Legacy data path:** `App.tsx`/`SigmaTab.tsx` → `parseConjugateData` → `extractPairs`/
  `buildTabRows`/`computeEffectiveNames` (`src/utils/appDataUtils.ts`) → `computeBaselineTargetExercises`
  (`src/hooks/data/useBaselineTargetExercises.ts`) → `calculateVolumeCorrelation` + `buildSessionStats`
  → `buildChartData` (all `@dyel/core`). Defaults used: `deadliftStance: 'sumo'`, `initialTabState()`.
- **Date-key bug found and fixed:** legacy keys by local calendar date, pipeline originally keyed
  by UTC ISO instant — `joinChartPointsByDate`/`diffChartSeries.ts` now normalizes both to local
  `YYYY-MM-DD` keys before comparing.
- **Normalization-fitting divergence (documented, not reconciled):** legacy's `fitVariantFactor`
  (`packages/core/src/utils/math/e1rm.ts`) and pipeline's `fitNormalizationModel`
  (`packages/pipeline/src/derive/normalize.ts`) independently reimplement e1RM variant-factor
  normalization with materially different behavior — asserted as soft-warn, not hard failure.
- **GitHub issue #451 filed** (chain/band magnitude collapsing) — appears resolved by commit
  `2c72ba8`, not yet explicitly confirmed closeable.
- **Session 2:** found baseline-exercise _selection_ itself (not just variant-factor fitting) was
  a divergence source — legacy's `defaultCompExerciseName` (stance-aware) vs. pipeline's
  `fitNormalizationModel` baseline selection (no stance awareness at all, prior to Session 3).
- **Session 3:** implemented `deadliftStance` athlete-preference plumbing (`AthleteContext`,
  `fitNormalizationModel`'s stance-preference pool tier) and a `compareBaselineIdentity` parity
  assertion (squat hard-asserted; bench and deadlift soft-warned). Left one explicit open design
  question: should a bare `comp-lift`-tagged deadlift log outrank an athlete's _explicit_
  `deadliftStance` preference? At the time, it did (pool priority was `competitionNamed > comp >
stancePool > entries`), which is why deadlift's soft-warn kept firing on the real fixture.

Divergence numbers as of Session 3:

| series   | value |
| -------- | ----- |
| squat    | 31.4% |
| bench    | 16.3% |
| deadlift | 25.4% |
| pushPull | 17.6% |
| total    | 22.6% |

---

## Session 4: Implementation

### Decision (user sign-off)

**"User selection overrides."** An athlete's explicit `deadliftStance` preference should outrank a
bare `comp-lift`-tagged pool, because the tag is _inferred_ (assigned whenever a logged set has no
stance word at all) whereas `deadliftStance` is an _explicit_ user selection. The `competitionNamed`
pool (driven by an unambiguous logged name like "Competition Deadlift") is **not** demoted — it's a
stronger explicit signal than a default-stance assumption, so it still wins over stance preference
when present.

**Resulting priority order for `lift:deadlift` only:**
`competitionNamed > stancePool > comp > entries` (was: `competitionNamed > comp > stancePool >
entries`). Squat/bench pool priority (`competitionNamed > comp > entries`, no stance tier — because
`stancePool` is always `[]` for non-deadlift families by construction) is completely unaffected.

### Task 1 — pool priority reorder (`packages/pipeline/src/derive/normalize.ts`)

Single-line ternary reorder in `fitNormalizationModel`'s `pool` selection, as designed above. No
family-specific branching needed since `stancePool` is empty for squat/bench.

### Task 2 — test coverage (`packages/pipeline/src/derive/normalize.test.ts`)

Added/updated `it.each`/regression coverage:

- Regression: bare `comp-lift`-tagged deadlift pool no longer wins over an athlete's explicit stance
  preference when a non-empty `stancePool` exists.
- Regression: `competitionNamed` still wins over stance preference when present.
- Existing sumo/conventional-preference and default-to-conventional cases still pass unchanged.
- Squat/bench `comp`-wins-when-no-stance-tier-applies coverage (pre-existing, confirmed unaffected).

**Result:** `npm test -w packages/pipeline -- normalize` → 22/22 passing.

### Task 3 — pipeline-wide verification gate

`npm test -w packages/pipeline` → **173 passed, 12 test files**. `npm run build -w packages/pipeline`
→ clean. No regressions elsewhere in the package.

### Task 4 — parity-test promotion (`totalChartParity.test.ts` + `diffChartSeries.ts`)

Checked the real fixture empirically (did not assume): after the Task 1 fix, deadlift's baseline
identity **now matches** between legacy and pipeline (`sumo` on both sides). Two changes were needed:

1. **`compareBaselineIdentity` fix (`packages/app/src/testUtils/diffChartSeries.ts`):** the
   pipeline-side stance resolution had a **hardcoded `'conventional'` fallback** for a bare
   canonical (no `-sumo`/`-conventional`/`-opposite` suffix — meaning "no stance info was logged").
   This was itself a latent bug: legacy's own `resolveDeadliftStance`
   (`packages/core/src/utils/lifts/resolveDeadliftStance.ts`) falls back to the athlete's declared
   `deadliftStance` preference for null/`'competition'` stance, **not** a hardcoded value. Fixed the
   pipeline-side fallback to match: bare canonical → resolves via the `deadliftStance` parameter,
   symmetric with the legacy side.
2. **`totalChartParity.test.ts`:** promoted deadlift from soft-warn to hard assert
   (`expect(comparison.matches).toBe(true)`), mirroring squat's existing hard assert. Bench remains
   soft-warn (separate, unrelated equipment-preference mismatch — see Open items below).

**Regression found and fixed during this task:** the `compareBaselineIdentity` fallback fix broke 3
pre-existing unit tests in `diffChartSeries.test.ts` that were written against the old (buggy)
hardcoded-`'conventional'` behavior. Root cause: those 3 cases used a bare `'deadlift'` canonical to
represent what should have been an _explicit_ stance — but per `packages/pipeline/src/tag/detect/
canonical.ts`, an explicitly-tagged stance always gets a suffix (bare canonicals only ever mean "no
stance info logged"). Fixed by correcting those 3 cases to use `'deadlift-conventional'` (preserving
each case's original match/mismatch intent), and added one new case explicitly covering the bare-
canonical/no-stance-info scenario this session's fix targets (`'deadlift: bare canonical with no
stance info resolves via athlete preference'`).

**A note on process:** a `qa-reviewer` subagent flagged the 3 failing tests correctly but proposed
reverting the fallback fix back to hardcoded `'conventional'` — which would have silently
reintroduced the bug this session set out to fix. Cross-checked against legacy's actual
`resolveDeadliftStance` implementation before accepting either the QA agent's diagnosis or its
proposed remedy; fixed the tests instead, since the fallback change was the one matching legacy's
real semantics.

**Result:** `npm test -w packages/app -- diffChartSeries` → 36/36 passing (35 pre-existing + 1 new).
`npm test -w packages/app -- totalChartParity` → 17/17 passing, deadlift baseline identity now a
hard assert with no soft-warn output (only bench's baseline-identity mismatch and the numeric
normalization-fitting divergences below still soft-warn).

### Task 5 — final divergence numbers (informational, no tolerance asserted)

Directly re-ran (ground truth, not relayed from a subagent) after all Session 4 changes:

| series   | Session 3 | Session 4 | Session 5 | delta (S4→S5)                  |
| -------- | --------- | --------- | --------- | ------------------------------ |
| squat    | 31.4%     | 31.4%     | 31.4%     | unchanged                      |
| bench    | 16.3%     | 16.3%     | 16.3%     | unchanged (identity ≠ fitting) |
| deadlift | 25.4%     | 25.4%     | 25.4%     | unchanged                      |
| pushPull | 17.6%     | 17.6%     | 16.3%     | improved (bench identity fix)  |
| total    | 22.6%     | 22.6%     | 20.4%     | improved (bench identity fix)  |

**Note:** the numeric per-series divergence is unaffected by this session's work — that's expected.
This session fixed baseline **identity** (which canonical is selected as the deadlift baseline),
not the underlying **variant-factor fitting** methodology gap (Open item #4 below), which is what
actually drives the remaining 16-31% divergence numbers. The two are related-but-distinct problems.

### Final verification (Session 4, ground-truth direct runs)

Run directly, not just relayed from subagent reports (a subagent misreported inflated counts —
326/23 for pipeline, 181/19 for app — on one verification pass; ground-truth direct runs below are
the authoritative numbers):

```
npm test -w packages/pipeline    → 173 passed, 12 test files, exit 0
npm run build -w packages/pipeline → exit 0
npm test -w packages/app         → 105 passed, 9 test files, exit 0
npm run build -w packages/app    → exit 0
```

### Files touched (Session 4)

- `packages/pipeline/src/derive/normalize.ts` — deadlift pool priority reorder
- `packages/pipeline/src/derive/normalize.test.ts` — new/updated `it.each` + regression coverage
- `packages/app/src/testUtils/diffChartSeries.ts` — `compareBaselineIdentity` bare-canonical
  fallback fix (hardcoded `'conventional'` → `deadliftStance` param, matching legacy semantics)
- `packages/app/src/testUtils/diffChartSeries.test.ts` — fixed 3 stale test cases + added 1 new case
- `packages/app/src/pipeline/totalChartParity.test.ts` — deadlift promoted from soft-warn to hard
  assert in the baseline-identity `it.each` block; bench unchanged (still soft-warn)

---

## Open items (NOT part of this session's scope — flagging for visibility)

1. ~~**Bench equipment-preference gap**~~ — **RESOLVED in Session 5.** Added a `pausedPool`
   baseline-priority tier (mirroring the deadlift `stancePool` pattern) so a paused/"commands"
   bench now outranks a plain comp-lift-tagged bench, matching legacy's hardcoded
   `commandsBench` preference. Bench baseline identity is now hard-asserted alongside
   squat/deadlift. See "Session 5: Implementation" below.
2. ~~**Deadlift comp-lift-vs-stance-preference shadowing**~~ — **RESOLVED this session.** Pool
   priority now puts explicit `deadliftStance` preference ahead of the inferred bare `comp-lift`
   tag; deadlift baseline identity is now hard-asserted and matches on the real fixture.
3. **GitHub issue #451** (band/chain magnitude collapsing) — the underlying fix (commit `2c72ba8`)
   appears to have already landed and resolved the previously-tracked pipeline build blocker.
   **Still not explicitly confirmed against the issue's original acceptance criteria** — worth a
   final check before closing.
4. **Remaining normalization-fitting divergence** (documented since Session 2, still present,
   unaffected by this session) — speed-work exclusion, minSamples gating, and canonical-grouping
   differences between legacy's `fitVariantFactor` and pipeline's `fitNormalizationModel` still
   account for the 16-31% per-series numeric divergence. This is a distinct problem from baseline
   _identity_ (which this session's and Session 3's work address) — baseline identity determines
   _which_ canonical is the reference point; variant-factor fitting determines how well _other_
   canonicals are normalized against that reference. Fixing identity does not fix fitting.
5. ~~**`ConjugateCharts` revert branch-target decision**~~ — **RESOLVED in Session 6.** Landed on
   the current branch (`integrate-new-pipeline`).
6. **After the `ConjugateCharts` revert** (Session 6), `mergeWideRechartsRows`
   (`packages/app/src/utils/pipelineChartUtils.ts`) and `usePipelineTotalChartData.ts` have no
   remaining _production_ callers (the former is still used by `conjugateChartParity.test.ts`, the
   latter is fully orphaned) — left alone deliberately, but worth a dedicated cleanup pass.
7. **(New, Session 6)** `conjugateChartParity.test.ts`'s per-variation join is currently a no-op on
   the real fixture — legacy display-name variation labels (e.g. `"Bench (1 board)"`) and pipeline
   canonical-slug variation labels (e.g. `"bench-american"`) never intersect for any of
   squat/bench/deadlift, so the harness's per-variation hard-assert branch never actually runs
   against live data; it only exercises the "no matched variations" soft-warn path. See "Session 6:
   Implementation" → Task 6 for full detail and example labels. Worth a dedicated session to either
   (a) map legacy display names to pipeline canonical slugs before joining, or (b) redesign the
   comparison to be structural (e.g. compare aggregate stats per lift type) rather than label-keyed.

---

## Session 5: Implementation — bench paused/"commands" preference fix

Executed the task breakdown scoped at the start of this session (Open item #1). All 4 planned tasks
are done.

### Finding (unchanged from scoping)

- **Legacy** (`packages/core/src/utils/lifts/defaultSelections.ts`, `defaultCompExerciseName`): among
  "competition-shaped" candidates (standard bar, competition stance, no added weight), _unconditionally_
  prefers entries tagged `equipment === 'pause'` (paused/"commands" bench) over plain no-equipment
  entries. **Unlike `deadliftStance`, this is not a user preference — it's hardcoded in legacy**, so
  no new `AthleteContext` field was needed; this is a pure pool-priority rule, scoped to `lift:bench`
  only.
- **Pipeline already detected the tag, just didn't consume it for baseline selection:** the
  `equip:pause` tag existed (`packages/pipeline/src/tag/detect/canonical.ts`) but a paused-bench
  entry never landed in the existing `comp` pool (which requires `comp-lift`, itself gated on having
  **zero** modifiers at all) — it fell through to the generic `entries` fallback.

### Task 1 — `pausedPool` tier (`packages/pipeline/src/derive/normalize.ts`)

Added a bench-only `pausedPool`: entries tagged `equip:pause` that are otherwise competition-shaped
(no `bar:`/`stance:`/`addl:` tag present — checked directly against `canonical.ts`'s exact `comp-lift`
gating logic, not just inferred from the legacy source, to avoid matching a paused lift that's also,
say, banded). Spliced into the priority chain ahead of `comp`:
`competitionNamed > stancePool (deadlift only) > pausedPool (bench only) > comp > entries`.
Squat/deadlift priority is unaffected (`pausedPool` is always `[]` for non-bench families).

### Task 2 — test coverage (`packages/pipeline/src/derive/normalize.test.ts`)

Added 5 new tests: paused-bench-wins-over-plain-comp, falls-back-to-comp-lift-when-no-paused-bench
(regression, unaffected), a paused-but-also-chains bench does NOT count as competition-shaped, the
tier doesn't leak into other families (squat), and `competitionNamed` still wins over a paused bench.

**Result:** `npm test -w packages/pipeline -- normalize` → 27/27 passing (22 pre-existing + 5 new).

### Task 3 — parity-test promotion (`totalChartParity.test.ts`)

Checked the real fixture empirically (did not assume): after the Task 1 fix, bench's baseline identity
**now matches** between legacy and pipeline — the "baseline bench mismatch" soft-warn no longer fires.
Simplified the baseline-identity `it.each` block to a uniform hard assert
(`expect(comparison.matches).toBe(true)`) across squat/bench/deadlift, removing the bench-specific
soft-warn branch.

**Result:** `npm test -w packages/app -- totalChartParity` → 17/17 passing, no baseline-identity
soft-warn output at all now (only the numeric normalization-fitting divergences below still soft-warn).

**Side effect:** fixing bench identity also improved the numeric divergence for series that aggregate
over bench — pushPull dropped from 17.6% to 16.3%, total from 22.6% to 20.4%. Bench's own numeric
divergence (16.3%) is unaffected — identity and fitting are distinct problems, same distinction
Session 4 documented for deadlift; Open item #4 (fitting) remains open.

### Task 4 — full regression gate

```
npm test -w packages/pipeline    → 178 passed, 12 test files, exit 0
npm run build -w packages/pipeline → exit 0
npm test -w packages/app         → 105 passed, 9 test files, exit 0
npm run build -w packages/app    → exit 0
```

### Files touched (Session 5)

- `packages/pipeline/src/derive/normalize.ts` — bench `pausedPool` priority tier
- `packages/pipeline/src/derive/normalize.test.ts` — 5 new tests
- `packages/app/src/pipeline/totalChartParity.test.ts` — bench promoted from soft-warn to hard
  assert in the baseline-identity `it.each` block, alongside squat/deadlift

---

## Verification Commands

Run from repo root:

```bash
# Pipeline unit tests (athlete/normalize/pipeline-wide)
npm test -w packages/pipeline -- athlete
npm test -w packages/pipeline -- normalize
npm test -w packages/pipeline -- pipeline
npm test -w packages/pipeline

# App-side diff/comparator + parity harness
npm test -w packages/app -- diffChartSeries
npm test -w packages/app -- totalChartParity
npm test -w packages/app -- conjugateChartParity
npm test -w packages/app

# Full builds
npm run build -w packages/pipeline
npm run build -w packages/app
```

---

## Related Files & Context

- **Test files:** `packages/app/src/pipeline/totalChartParity.test.ts`,
  `packages/app/src/pipeline/conjugateChartParity.test.ts` (landed in Session 6)
- **Diff utilities:** `packages/app/src/testUtils/diffChartSeries.ts` + `diffChartSeries.test.ts`
- **Pipeline core logic:** `packages/pipeline/src/derive/athlete.ts`,
  `packages/pipeline/src/derive/normalize.ts`, `packages/pipeline/src/pipeline.ts`
- **Legacy stance resolution (mirrored, not imported):**
  `packages/core/src/utils/lifts/defaultSelections.ts` (`defaultCompExerciseName`),
  `packages/core/src/utils/lifts/resolveDeadliftStance.ts`
- **Pipeline canonical-naming logic:** `packages/pipeline/src/tag/detect/canonical.ts` (explicit
  stance always gets a suffix; bare canonical means "no stance info logged")
- **Core exports:** `@dyel/core`: `parseConjugateData`, `buildChartData`, `buildVariationChartData`,
  `buildSessionStats`, `calculateVolumeCorrelation`
- **Pipeline exports:** `@dyel/pipeline`: `runPipeline`, `fitNormalizationModel`, `normalizeE1rm`;
  types: `AthleteContext`, `PipelineResult`, `NormalizationModel`
- **App utils:** `src/utils/appDataUtils.ts`, `src/hooks/data/useBaselineTargetExercises.ts`
- **Docs:** `packages/app/CLAUDE.md` (pipeline-migration-boundary exception),
  `packages/app/src/testUtils/CLAUDE.md` (harness docs)
- **Tracked issue:** [#451](https://github.com/kasittig/dyel-visualizer/issues/451) —
  chain-count/band-tension canonical collapsing (appears resolved by `2c72ba8`; confirm before closing)
- **Plan file (Session 6):** `/Users/kasittig/.claude/plans/how-would-you-move-mellow-pixel.md`
  (original detailed breakdown) and
  `/Users/kasittig/.claude/plans/load-handoff-md-break-elegant-tome.md` (execution plan actually
  used, includes the Task 0 branch-cleanup step) — both describe the now-completed `ConjugateCharts`
  revert.
- **Related branch (Session 6):** `migration-phase-1` — moves `ConjugateCharts` further onto
  pipeline rather than reverting it; not used this session, see "Session 6: Findings".

---

## Next Steps

1. **Commit Session 6's changes.** Currently all uncommitted working-tree state. Suggested split:
   one commit for the 4 production-code reverts (`useConjugateChartData.ts`, `ConjugateCharts.tsx`,
   `LiftTabPanel.tsx`, `App.tsx`), one commit for the new `conjugateChartParity.test.ts` harness, and
   a decision on the unrelated `HANDOFF.md` edit (roll into one of the above or its own commit).
2. Confirm GitHub issue #451 can be closed (Open item #3).
3. Consider whether the remaining normalization-fitting divergence (Open item #4) is worth a
   dedicated future session — it's the primary remaining source of per-series numeric divergence for
   `TotalChart` (all baseline-identity gaps across squat/bench/deadlift are resolved as of Session 5)
   and is architecturally distinct from the baseline-identity work done in Sessions 3-5.
4. **(New, Session 6)** Decide how to address Open item #7 — `conjugateChartParity.test.ts`'s
   per-variation join is currently a no-op due to legacy-display-name vs. pipeline-canonical-slug
   label mismatch. Worth scoping as its own session.
5. **(New, Session 6)** Dedicated cleanup pass for `mergeWideRechartsRows`/
   `usePipelineTotalChartData.ts` orphaned-after-revert code (Open item #6).
6. Once ready, create a PR referencing this work and merge to `main`.
