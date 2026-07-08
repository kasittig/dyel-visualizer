# SPECIFICATIONS

Tracking doc for `@dyel/pipeline` migration work, coordinated by team-lead. See
`MIGRATION_PLAN.md` for overall ordering rationale, `APP_COMPONENTS.md` for the component
inventory, and `HANDOFF.md`/`migration/ConjugateCharts.md` for deep-dive root-cause writeups
referenced below.

## Completed work (summarized)

### 1. deadliftStance athlete preference + baseline-canonical-identity parity assertion — ✅ COMPLETE

Added `AthleteContext.deadliftStance: 'sumo' | 'conventional'` (default `'sumo'`, matching
legacy's hardcoded default) to `packages/pipeline/src/derive/athlete.ts`, wired as an explicit
fallback tier in `fitNormalizationModel`'s deadlift baseline selection
(`packages/pipeline/src/derive/normalize.ts`). Exposed the fitted `NormalizationModel` on
`PipelineResult` (`packages/pipeline/src/pipeline.ts`) so `totalChartParity.test.ts` could add
a baseline-identity assertion (legacy's resolved baseline per family vs. pipeline's
`model.baseline`) — now a hard-assert for squat/bench/deadlift, 17/17 passing.

### 2. Phase 2 — SigmaTab + VariationRadarChart — ✅ COMPLETE

`SigmaTab.tsx` fully swapped to `@dyel/pipeline` (`usePipelineTotalChartData` +
`mergeVolumeIntoChartPoints` helper for the `volume` series sourced from `App.tsx`'s existing
`volumeByDate` prop); zero `@dyel/core` imports remain. `sigmaTabParity.test.ts` added
(hard-assert squat/deadlift/pushPull/total, soft-warn bench). `VariationRadarChart`'s
pipeline-native replacement (`conjugateChartSpecs()` + `snapshotVariationsFromPipeline()`) was
built and parity-tested (`variationRadarChartParity.test.ts`) but the component swap-over was
**deliberately deferred** — the underlying per-variation normalization is the same one
`ConjugateCharts` was reverted from after surfacing real divergence (see item 4 below), and the
component needs per-session tooltip detail the pipeline snapshot doesn't carry. Docs
(`MIGRATION_PLAN.md`, `APP_COMPONENTS.md`) updated accordingly.

### 3. Phase 3 — SessionBarChart + SigmaChart + DateLineChart — ✅ COMPLETE

Pure `@dyel/core` boundary cleanup (no aggregation logic in these three components). Added
`formatChartDate` to `packages/app/src/utils/pipelineChartUtils.ts` (relocated from `@dyel/
core`'s `formatDate`); all three components now import `ChartPoint` from `@dyel/pipeline` with
zero remaining `@dyel/core` references. Three lightweight regression tests added
(`sessionBarChartParity.test.ts`, `sigmaChartParity.test.ts`, `dateLineChartParity.test.ts`),
reusing `sigmaTabParity.test.ts`'s already-validated pipeline-derived fixture data rather than
reimplementing a legacy diff. **Independently re-verified via `qa-reviewer` (2026-07-07):** all
builds clean (pipeline/core/app), full `npm test -w packages/app` — 19/19 files, 200/200 tests,
zero regressions.

### 4. ConjugateCharts normalization divergence (Phase 4 blocker scoping) — mostly ✅, one item open

`ConjugateCharts` was migrated to `@dyel/pipeline` once, then reverted (`46f267f`) after
`conjugateChartParity.test.ts` surfaced real legacy-vs-pipeline divergence. This item
root-caused and closed/narrowed six findings (full detail in `migration/ConjugateCharts.md`):

- **#1 (speed-work filtering):** removed pipeline's `effortOnly` exclusion to match legacy's
  unfiltered fitting — fixed.
- **#2 (minSamples gating):** investigated, found to be a non-issue.
- **#3 (canonical/label grouping):** added opt-in `groupBy: 'label'` on `SeriesSpec` +
  `buildPointsByLabel` (`packages/pipeline/src/dataset/build.ts`, `pipeline.ts`), wired into
  `conjugateChartSpecs.ts` — preserves per-exact-variant chart granularity. Largest gap, fixed.
- **#5 (day-level effort/volume filtering asymmetry):** added `'e1rm-max-effort'` deriver
  (`packages/pipeline/src/derive/derivers.ts`) mirroring legacy's `splitByEffort` (drops
  "volume" days entirely rather than falling back to speed-work sets). Also fixed a pre-existing
  test-harness bug (`pipelineVariationKeys` only read the first row's keys, not the union).
  Result: every matched variation series across all three lift types shows
  `missingInA=0, missingInB=0`.
- **#4 (normalized-series "no date overlap"):** root-caused as a test-harness key-name bug
  (`conjugateChartParity.test.ts` checked `liftType in point` instead of `'normalized' in
point`) — not a real data divergence. Fixed; squat's `normalized` composite is now exact
  (0% diff). Unmasked bench (9.8%) and deadlift (5.1%) real divergence → became Finding #6.
- **#6 (addlWtOffset never wired into pipeline normalization):** root-caused —
  `packages/pipeline/src/derive/normalize.ts`'s `fitNormalizationModel`/`normalizeE1rm` never
  consumed `addlWtOffset` (chain/band correction), unlike legacy. **Design B** (user sign-off):
  fit-time offset-adjusts weights before fitting `variantFactor` for addlWt canonicals
  (mirrors `sessionIndex.ts`); apply-time mirrors legacy's `findBestE1RM` e1RM-space
  approximation (not `normalizeToBaseE1RM`'s weight-space exact correction — no signature
  break needed). Implemented in `normalize.ts` (`normalizeE1rm`/`projectToVariant`). Real
  before/after `maxRelDiff`: squat 0.0% (unchanged), bench 9.8%→7.0%, deadlift 5.1%→0.4%
  (ConjugateCharts); TotalChart independently confirmed to share the same divergence/fix via
  `git stash` bisection: bench 7.0%, deadlift 2.7%, total 1.8%. Narrowed substantially, not
  fully closed (Design B is a documented legacy approximation, not an exact correction) — see
  open item below for the follow-up scoping this residual.

Verified throughout: `npm run build -w packages/pipeline && npm run build -w packages/app &&
npm test -w packages/pipeline && npm test -w packages/app` green (pipeline 12 files/203 tests,
app 19 files/200 tests), independently re-verified via `qa-reviewer` at each step.

**Open — Task 8:** actually swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` back onto
`@dyel/pipeline`. This entire multi-session effort narrowed/closed the normalization
divergence but never attempted the component swap itself. Per-variation soft-warns remain
**not** promoted to hard-assert (sample sizes n=1-5 per series, judged too sparse). Not
started — next step for whoever picks up Phase 4.

- [ ] Task 8: Swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto `@dyel/pipeline`,
      using `conjugateChartSpecs()` (with `groupBy: 'label'`) + the now-fixed normalization
      model. (Target: `packages/app/src/components/pages/ConjugateCharts.tsx` (or wherever it
      now lives), `packages/app/src/hooks/useConjugateChartData.ts`. Test: `npm test -w
packages/app -- conjugateChartParity` plus full `npm test -w packages/app`)

---

## Closing the residual TotalChart divergence (post Finding #6 / Design B) — ✅ IMPLEMENTED (partial close)

Design B (above) narrowed but did not close `TotalChart`'s bench/deadlift/total divergence
(7.0%/2.7%/1.8%, informational only, no hard tolerance asserted). Design C closed deadlift
further; bench/total/squat/pushPull are unaffected (either already 0% or a separate
pre-existing issue — see real numbers below).

**Root cause confirmed (2026-07-07, via direct code reading — not a throwaway script, but
exact source inspection of both call paths):** legacy's actual `TotalChart`/`ConjugateCharts`
data path (`buildVariationChartData.ts`, `buildChartData.ts`) calls `normalizeToBaseE1RM`
(`packages/core/src/utils/stats/repCalculator.ts:80-136`) **per raw session row**, correcting
`addlWtOffset` in weight-space before `calcE1RM` ever runs. Design B instead mirrors
`findBestE1RM` (`repCalculator.ts:41-78`), a single-point e1RM-space approximation applied
post-hoc to an already-derived day-level e1RM value
(`packages/pipeline/src/dataset/build.ts:73`). Confirmed the composite/normalize path is the
only place needing correction — `SeriesSpec` output (e.g. ConjugateCharts' `variations`) uses
legacy's raw, uncorrected `session.e1rm` and must stay untouched. Also confirmed
`projectToVariant` has **zero production callers** anywhere in `packages/pipeline` or
`packages/app` (only tests + re-export) — narrows blast radius.

**Design C signed off by user (2026-07-07).** Pipeline-sequencing investigation
(`packages/pipeline/src/pipeline.ts`) confirmed no chicken-and-egg ordering problem:
`fitNormalizationModel` already fits directly from raw `TaggedSetRecord[]`, independent of
`buildPoints`/derivers — it only happens to run after `buildPoints` in source today, nothing
requires that order. Sub-approach (a) — weight-space correction applied to raw records
_before_ the `e1rm`/`e1rm-max-effort` deriver runs, for composite specs only — is
architecturally reachable via resequencing, not a new pipeline stage. Sub-approach (b)
(two derivation passes at apply-time) was rejected: duplicates derivation logic per render,
risks the same date/day-grouping mismatch this work is trying to close.

### Implementation plan (ordered)

1. **`packages/pipeline/src/derive/normalize.ts`**: extract the existing per-record
   weight-space adjustment (currently inlined in `fitNormalizationModel`, Task 10a) into a new
   exported `offsetAdjustRecords(records, model): TaggedSetRecord[]` function; reuse it inside
   `fitNormalizationModel`'s `recordsToFit` line (single source of truth). **Revert** Task 10b's
   offset lines in `normalizeE1rm`/`projectToVariant` back to pure factor operations
   (`e1rmKg / f`, `baseE1rmKg * f`) — Design C supersedes Task 10b; comment explaining why.
   Flag (don't fix) that `projectToVariant` has no principled post-hoc way to reintroduce a
   target's offset now that it's a raw-weight/per-set concept — pre-existing approximation
   gap, not a regression, and it has zero production callers today.
2. **`packages/pipeline/src/pipeline.ts`**: resequence so `fitNormalizationModel` runs before/
   alongside `pointsByDeriver` construction; compute `compositeDeriverIds` (deriver IDs used by
   composite specs only, mirroring the existing `labelGroupByDeriverIds` pattern); build
   `offsetAdjustedTagged = offsetAdjustRecords(tagged, model)` and a
   `pointsByDeriverAdjusted` map from it; wire composite specs to consume the adjusted points,
   series/label specs unchanged. Leave `e1rmPoints`, `unnormalized`, and `diagnose(...)` on raw
   (uncorrected) points — unaffected, out of scope (`diagnose.ts` has a separate, pre-existing
   addlWt gap, not touched here).
3. **`packages/pipeline/src/dataset/build.ts`**: no code change — the composite branch already
   calls `normalizeE1rm(p.series, p.v, model)`; since it now receives pre-corrected points for
   composite specs and `normalizeE1rm` is pure-factor, this becomes correct with zero edits.
4. **`packages/pipeline/src/index.ts`**: export `offsetAdjustRecords` (additive only).
5. **`packages/pipeline/src/derive/CLAUDE.md`**: document `offsetAdjustRecords`; note
   `normalizeE1rm`/`projectToVariant` are pure factor functions again, and addlWt correction
   happens upstream in `pipeline.ts` pre-derivation, composite specs only.

### Task list

- [x] Task 1: Root-cause confirmed via direct code reading (see above) — hypothesis validated,
      not falsified.
- [x] Task 2: Design C signed off by user (2026-07-07).
- [x] Task 3: Implemented steps 1–5 above. (Target: `packages/pipeline/src/derive/normalize.ts`,
      `packages/pipeline/src/pipeline.ts`, `packages/pipeline/src/index.ts`,
      `packages/pipeline/src/derive/CLAUDE.md`. Test: `npm test -w packages/pipeline --
normalize`)
- [x] Task 4: Update test coverage: - `normalize.test.ts`: rewrite the two `normalizeE1rm`/`projectToVariant` offset-formula
      tests to pure `e1rmKg / factor` / `baseE1rmKg * factor`; retire/rename the Task 10b
      "apply-time offset adjustment" describe block; add new `describe('offsetAdjustRecords')`
      coverage (adds offset for addlWt canonicals, no-ops for non-addlWt and baseline
      canonicals, doesn't mutate input). Round-trip tests should pass unmodified. - `pipeline.test.ts`: add an addlWt (chain) canonical fixture feeding a composite spec,
      using **reps > 1** (Epley is nonlinear — reps=1/no-rpe makes weight-space and e1RM-space
      offset application mathematically identical and would NOT prove the fix), asserting the
      composite value matches `calcE1RM(rawWeight + offsetKg, reps, rpe) / factor`. - `dataset/build.test.ts`: add a case confirming `buildDataset` doesn't double-correct
      when given pre-corrected points + a model with `addlWtOffset` populated. - `derivers.test.ts`: confirm no changes needed (derivers untouched); quick check that no
      existing test assumes `TaggedSetRecord.weight` is never mutated upstream.
      (Target: `packages/pipeline/src/derive/normalize.test.ts`,
      `packages/pipeline/src/pipeline.test.ts`, `packages/pipeline/src/dataset/build.test.ts`.
      Test: `npm test -w packages/pipeline`)
- [x] Task 5: Full build/test pass — clean.
- [x] Task 6: Re-run `totalChartParity.test.ts` + `conjugateChartParity.test.ts` — real numbers
      below. **Important correction to this task's original framing**: squat was never at
      0.0% on `TotalChart` (that 0.0% figure only ever applied to ConjugateCharts' squat
      `normalized` composite, which has 0 addlWt variants by construction). An early QA pass
      flagged squat's unchanged 0.7% as a false "regression" — **directly disproven via
      `git stash` bisection** (see below): squat was already at 0.7% pre-Design-C, a
      pre-existing, separately-tracked divergence unrelated to addlWt/Design C. No tolerance
      values needed tightening — the tests use soft-warn `console.warn`, not hardcoded
      `toBeCloseTo` thresholds.
- [x] Task 7: Docs updated (this section).
- [x] Task 8 (QA): Independent full-suite re-verification via `qa-reviewer` — clean, see below.

**Status: Design C implemented and verified (2026-07-07).**

### Real before/after numbers (`totalChartParity.test.ts`, verified via `git stash` bisection)

| Series   | Before Design C                    | After Design C          | Change                                                                      |
| -------- | ---------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| squat    | 0.7% (maxAbsDiff=1)                | 0.7% (maxAbsDiff=1)     | unchanged — pre-existing, unrelated to addlWt (squat has 0 addlWt variants) |
| bench    | 7.0% (maxAbsDiff=10)               | 7.0% (maxAbsDiff=10)    | unchanged                                                                   |
| deadlift | 2.7% (maxAbsDiff=6)                | **0.6%** (maxAbsDiff=1) | **genuine improvement**, further closes Design B's residual                 |
| pushPull | 2.5% (maxAbsDiff=10, missingInB=6) | 2.5% (unchanged)        | unaffected                                                                  |
| total    | 1.8% (maxAbsDiff=10)               | 1.8% (unchanged)        | unaffected                                                                  |

`conjugateChartParity.test.ts` `normalized` composites: squat 0.0% (unchanged, exact),
bench 7.0% (unchanged), deadlift 0.4% (unchanged from Design B's number — Design C's
improvement shows on `TotalChart`'s deadlift specifically, not ConjugateCharts' deadlift,
likely due to differing component/canonical sets between the two specs' composite
definitions — not investigated further, out of scope).

Bench staying flat at 7.0% on both harnesses despite bench having addlWt (chain) canonicals
is a known open question — Design C measurably helped deadlift but not bench, meaning some
other bench-specific factor (not investigated this session) also contributes to its
divergence. Flagged for future investigation, not blocking.

### Implementation notes (deviations from the original plan)

- An early independent QA pass reported squat regressing 0.0%→0.7%, triggering a full
  root-cause investigation (`senior-coder`, no shell access, static analysis only) that
  produced a defensive rework of `pipeline.ts`'s `pointsByDeriverAdjusted` construction —
  changed from "recompute all composite-spec points via a second full `buildPoints` pass on
  offset-adjusted records" to "reuse the original `pointsByDeriver` points object-identically,
  splicing in only the specific (date, canonical) points for canonicals that actually have a
  fitted `addlWtOffset` entry." This makes the non-addlWt no-op guarantee true _by
  construction_ rather than relying on two independent derivation passes coincidentally
  producing identical output. **Kept this change** even after the "regression" was proven to
  be a pre-existing non-issue (via `git stash` bisection directly against the pre-Design-C
  tree) — it's a strictly more robust implementation with zero behavior change for
  addlWt-bearing canonicals, verified by full pipeline test suite staying green (207/207)
  before and after.
- Test-count self-report accuracy: an earlier implementer claimed "538 tests / 35 files" for
  the pipeline package post-change. Independently verified via `qa-reviewer` (twice) to
  actually be **207 tests / 12 files** — consistent with this repo's known pre-Design-C
  baseline (203 tests/12 files) plus 4 net new tests. The 538/35 claim was false; flagging per
  this project's established distrust-but-verify precedent (see prior Finding #6 QA-claim
  correction).

---

## Verification (all completed sections)

`npm run build -w packages/pipeline && npm run build -w packages/app && npm test -w
packages/pipeline && npm test -w packages/app` — all green as of last full run (pipeline
12 files/216 tests, app 19 files/200 tests), independently re-verified via `qa-reviewer`.

## Currently open items

1. **ConjugateCharts Task 8** — component swap-over onto `@dyel/pipeline`, not started.
2. **Bench's flat 7.0% divergence** — resolved; kept here only as a pointer to the section
   below (all 10 tasks including final closeout QA are complete, see
   "Fixing bench's flat 7.0% divergence" for detail).
3. **Squat's 0.7% divergence** — root cause unknown, no tracking issue filed yet. The one
   standalone unexplained gap remaining; unrelated to equipment-magnitude collapsing
   (`dd01c17`), addlWt correction (`Design C`), or the chain-count/band-tension fix
   (`#451`/`PR #454`), which all had measurable effects on other series.
4. **PushPull's 0.3% residual** — confirmed (not speculated) to be downstream of bench and
   deadlift's own residuals via `composite('pushPull', ['bench', 'deadlift'])` in
   `totalChartSpecs.ts` (same in both legacy and pipeline implementations). Expected to close
   automatically once bench and deadlift fully close rather than requiring separate
   root-cause investigation.

---

## Fixing bench's flat 7.0% divergence — equipment-magnitude canonical collapsing — ✅ COMPLETE (10/10 tasks)

### Root cause (verified via direct code trace + fixture correlation, not Design C-related)

`EQUIPMENT_DETECTORS`'s `board` entry (`packages/pipeline/src/tag/detect/detectors.ts:42`)
matches any string containing `"board"` and discards the count, so `Bench (1 board)` and
`Bench (2 board)` both resolve to a single canonical (`bench-board`). `fitNormalizationModel`
(`packages/pipeline/src/derive/normalize.ts`) then fits **one blended `variantFactor`** across
both board counts for that canonical. Legacy's `buildSessionStats`
(`packages/core/src/utils/stats/sessionIndex.ts:51,55`) groups by the exact `displayName`
string, so `Bench (1 board)` and `Bench (2 board)` get **independent** fits
(`sessionIndex.ts:112`) — never blended. This is unrelated to/additive with Design C: bench's
addlWt (chain) canonicals already get their offsets fit and applied correctly.

**Evidence:** a throwaway debug harness (deleted, working tree clean) diffed legacy vs.
pipeline bench output per date on `total-chart-sheet.csv`; the three worst-diverging dates
(7.04%, 2.33%, 1.91% — next-worst is 0.67%) are exactly the fixture's three board-press
session dates. Corroborates `migration/ConjugateCharts.md` Finding #6's dismissed
hypothesis-1 (board pooling) — dismissed correctly for the _aggregate_ composite gap, but it
is the near-total explanation for bench's _residual_ post-Design-C 7.0%.

### Task 1 findings (2026-07-07, via `feature-implementer` audit) — scope generalized

Audited all 9 `EQUIPMENT_DETECTORS` entries (`board`, `block`, `deficit`, `box`, `incline`,
`decline`, `pause`, `floor`, `rack`) against real exercise strings in `packages/app/test/
fixtures/*.csv` and `packages/pipeline/test/fixtures/*.csv`. Two additional detectors share
`board`'s exact bug pattern (substring match on `.includes(...)` that discards a numeric
magnitude qualifier):

- **`block`**: fixture has `Deadlift (2" block)` (5 occurrences across 3 dates) — all
  currently the _same_ height, so no active divergence today, but a **latent** bug: any future
  session logging `Deadlift (1" block)` would blend into the same canonical
  (`deadlift-blocks`).
- **`deficit`**: fixture has `Deadlift (2" deficit)` (4 occurrences across 3 dates, one with an
  `opposite` stance qualifier) — same situation: identical heights today, latent risk if
  heights ever diverge.
- **`box`, `incline`, `decline`, `pause`, `floor`, `rack`**: no numeric/magnitude variants
  found in either fixture set. Excluded from this fix's scope — can be revisited if/when
  fixture data or real usage shows a need.

**Scope decision: generalize the fix to `board` + `block` + `deficit`.** Same code path, same
regex-extraction pattern, minimal incremental cost over board-only, and closes two latent bugs
identical in shape to the one actively causing bench's divergence (block/deficit affect
deadlift canonicals, not bench, but the same structural gap applies). `box`/`incline`/
`decline`/`pause`/`floor`/`rack` stay out of scope — no evidence of need, avoids
over-engineering for speculative cases.

This changes Tasks 2–6 below from "board-only" to "board + block + deficit," using the same
mechanism for all three magnitude-bearing equipment kinds. No change to Tasks 7–10.

### Chosen fix design

**Structural canonical fix** (preferred over mirroring `groupBy: 'label'` into the
`variantFactor` fit step, which would be more invasive to `NormalizationModel`'s
canonical-keyed shape per `derive/CLAUDE.md` and would need separate sign-off like Designs
B/C did): extend board/block/deficit detection to capture the numeric magnitude and thread it
into the canonical, mirroring the existing `addlWts` magnitude pattern (chains already parses
digit/`"double"` → magnitude, default `"1"`, omitted from the canonical string when `"1"`; see
`canonical.ts:49` and its `canonical.test.ts` matrix). Once canonicals split
(`bench-board` for 1-board, `bench-board-2` for 2-board; `deadlift-blocks`/`deadlift-blocks-2`;
`deadlift-deficit`/`deadlift-deficit-2`), `fitNormalizationModel`'s existing
`Object.groupBy(history, r => r.canonical)` (`normalize.ts`) automatically fits them
separately — no `derive/`/`pipeline.ts` changes needed. Fix is fully contained to the `tag/
detect/` layer.

### Implementation summary (all independently `qa-reviewer`-verified at each step)

- **Task 2:** Added `equipmentMagnitude: string | null` to `ParsedExercise`
  (`packages/pipeline/src/tag/detect/conjugate-types.ts`), with placeholder `null` wired into
  both `parseExercise.ts` return statements to keep the build green ahead of Task 3.
- **Task 3:** Implemented magnitude parsing in `packages/pipeline/src/tag/detect/
parseExercise.ts`: digit or the word `"double"` before `"board"`; digit (optionally followed
  by a `"` inch mark) before `"block"`/`"blocks"` or `"deficit"`; defaults to `'1'` when no
  digit is present. Populates `equipmentMagnitude` only for `board`/`block`/`deficit`
  equipment; stays `null` for all other kinds.
- **Task 4:** Wired `equipmentMagnitude` into `buildCanonical`
  (`packages/pipeline/src/tag/detect/canonical.ts`): appends `-${magnitude}` when present and
  not the default `'1'`, mirroring the existing chains/addlWts omit-default convention.
  Confirmed `buildTagsAndEffects` stays keyed by `ex.equipment` only (not magnitude) — tags/
  effects unaffected by design. Real verified canonical strings: `Bench (1 board)` →
  `bench-board` (unchanged), `Bench (2 board)`/`Bench (3 board)` → `bench-board-2`/
  `bench-board-3` (new); `Deadlift (blocks)` → `deadlift-blocks` (unchanged), `Deadlift (2
blocks)` → `deadlift-blocks-2` (new); `Deadlift (deficit)` → `deadlift-deficit` (unchanged),
  `Deadlift (2 deficit)` → `deadlift-deficit-2` (new).
- **Task 5:** Extended `canonical.test.ts`'s existing magnitude `it.each` matrix with 9 new
  rows covering board/block/deficit default and non-default cases plus the `"double"` word
  equivalence (`Bench (double board)` → `bench-board-2`) and quote-mark notation
  (`Deadlift (2" blocks)` → `deadlift-blocks-2`). Pipeline test count: 207 → 216.
- **Task 6:** Documented the equipment-magnitude convention in `packages/pipeline/src/tag/
CLAUDE.md`'s "Canonical format" section (new "Magnitude conventions" subsection), parallel to
  the existing chains/addlWts documentation, with the same before/after examples verified in
  Task 4.

### Real before/after numbers (Task 7, `totalChartParity.test.ts` + `conjugateChartParity.test.ts`)

| Series   | Before (post Design C)             | After (this fix)        | Change                                                                                                                                                         |
| -------- | ---------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| squat    | 0.7% (maxAbsDiff=1)                | **0.7%** (maxAbsDiff=1) | unchanged — no equipment-magnitude variants                                                                                                                    |
| bench    | 7.0% (maxAbsDiff=10)               | **0.7%** (maxAbsDiff=1) | **~10x improvement — confirms root cause**                                                                                                                     |
| deadlift | 0.6% (maxAbsDiff=1)                | **0.6%** (maxAbsDiff=1) | unchanged — fixture's block/deficit heights are uniform, so the split had no numeric effect this fixture (latent bug closed structurally, not observable here) |
| pushPull | 2.5% (maxAbsDiff=10, missingInB=6) | **0.3%** (maxAbsDiff=1) | **~8x improvement — downstream ripple from bench's fix**                                                                                                       |
| total    | 1.8% (maxAbsDiff=10)               | **0.2%** (maxAbsDiff=1) | **~9x improvement — downstream ripple from bench's fix**                                                                                                       |

`conjugateChartParity.test.ts` `normalized` composites: squat 0.0%→0.0% (unchanged, exact),
bench 7.0%→**0.7%** (same ~10x improvement as TotalChart), deadlift 0.4%→0.4% (unchanged, same
reasoning as above).

Literal console output (`totalChartParity.test.ts`, independently re-verified via
`qa-reviewer` at Task 7 and again at the final Task 10 closeout pass):

```
core-vs-pipeline squat: compared=13 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.7%
core-vs-pipeline bench: compared=22 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.7%
core-vs-pipeline deadlift: compared=19 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.6%
core-vs-pipeline pushPull: compared=40 missingInA=0 missingInB=6 maxAbsDiff=1 maxRelDiff=0.3%
core-vs-pipeline total: compared=46 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.2%
```

All hard-assert tests remain green throughout; no tolerance values were loosened to achieve
these numbers — bench/pushPull/total are soft-warn (`console.warn`) series per existing
convention, and their improvement is a genuine measured side effect, not a test change.

**Deadlift stayed flat, not a concern:** the fixture's block/deficit sessions all happen to use
the same height (2") in every logged instance, so the canonical split (`deadlift-blocks` vs
`deadlift-blocks-2`, `deadlift-deficit` vs `deadlift-deficit-2`) has zero observable effect on
_this_ fixture's numbers — it closes a **latent** bug (protecting against future divergence if
mixed heights are ever logged) rather than an active one, exactly as scoped in the Task 1
findings above.

### Task 10 — final closeout QA (2026-07-07, `qa-reviewer`, independent re-run)

Ran, independently and for real: `npm run build -w packages/pipeline`, `npm run build -w
packages/app`, `npm test -w packages/pipeline`, `npm test -w packages/app`, plus the parity
tests directly (`totalChartParity`, `conjugateChartParity`) to re-capture their console.warn
divergence output as a final sanity check. Result: **PASS** — pipeline 12 files/216 tests
(exact match to expected), app 19 files/200 tests (exact match), both builds clean, bench
maxRelDiff confirmed at 0.7% (down from the historical 7.0% baseline), all other series
matching the Task 7 numbers above exactly. No discrepancies found between this final pass and
every individual task's independent verification as it landed earlier in this session.

### Task list (ordered)

- [x] Task 1: Audit `BAR_DETECTORS`/`STANCE_DETECTORS`/`EQUIPMENT_DETECTORS`
      (`detectors.ts`) against real fixture data for other magnitude-bearing modifiers that
      collapse the same way board does. **Result: `block` and `deficit` share the bug
      (currently latent, no active divergence); `box`/`incline`/`decline`/`pause`/`floor`/
      `rack` have no observed magnitude variants and stay out of scope. Scope generalized to
      board + block + deficit** (see findings above). (Target:
      `packages/pipeline/src/tag/detect/detectors.ts`; Test: n/a — written findings)
- [x] Task 2: Added `equipmentMagnitude: string | null` to `ParsedExercise`
      (Target: `packages/pipeline/src/tag/detect/conjugate-types.ts`)
- [x] Task 3: Extended board/block/deficit detection to parse magnitude (digit or `"double"`
      before `"board"`; digit+quote before `"block"`/`"deficit"`; default `"1"` in all cases),
      mirroring the existing chains magnitude regex; wired into `parseExercise` so
      non-accessory lifts populate `equipmentMagnitude` when `equipment` is `'board'`,
      `'block'`, or `'deficit'`. (Target: `packages/pipeline/src/tag/detect/detectors.ts`,
      `packages/pipeline/src/tag/detect/parseExercise.ts`)
- [x] Task 4: Updated `buildCanonical` to append `equipmentMagnitude` to the canonical string
      when present and not the default (`"1"`), matching the chains omit-default convention
      (`bench-board` stays unchanged for 1-board; `bench-board-2` for 2-board; same pattern
      for `deadlift-blocks`/`deadlift-deficit`). Confirmed `buildTagsAndEffects`'s
      `equip:board`/`equip:block`/`equip:deficit` tag/effects lookups (keyed by `ex.equipment`,
      not magnitude) are unaffected by design — no behavior change needed there.
      (Target: `packages/pipeline/src/tag/detect/canonical.ts`)
- [x] Task 5: Extended `canonical.test.ts`'s existing magnitude-qualified-modifier `it.each`
      matrix with board/block/deficit cases (9 new rows; pipeline test count 207 → 216),
      following the same pattern already used for chains/bands. (Target:
      `packages/pipeline/src/tag/detect/canonical.test.ts`; Test:
      `npm test -w packages/pipeline`)
- [x] Task 6: Updated `packages/pipeline/src/tag/CLAUDE.md`'s "Canonical format" section to
      document equipment-magnitude handling for board/block/deficit (parallel to how `addlWts`
      magnitude is already documented there). (Target: `packages/pipeline/src/tag/CLAUDE.md`)
- [x] Task 7: Re-ran `totalChartParity.test.ts` and `conjugateChartParity.test.ts` — real
      numbers above. Bench improved 7.0%→0.7% (~10x), confirming root cause. Squat/deadlift
      unchanged (deadlift's block/deficit split is a latent-bug close, not observable on this
      fixture). PushPull/total also improved (7.0%→0.7% bench ripples into these composites).
      (Target: `packages/app/src/pipeline/totalChartParity.test.ts`,
      `packages/app/src/pipeline/conjugateChartParity.test.ts`; Test:
      `npm test -w packages/app`)
- [x] Task 8: Full build/test pass, both packages — clean, single combined run.
      (Test: `npm run build -w packages/pipeline && npm run build -w packages/app && npm
  test -w packages/pipeline && npm test -w packages/app`)
- [x] Task 9: Docs — this section updated to reflect completion with real numbers;
      `FIX_BOARD_COUNT.md` and `HANDOFF.md` updated to match. (Target: `SPECIFICATIONS.md`,
      `FIX_BOARD_COUNT.md`, `HANDOFF.md`)
- [x] Task 10 (QA): Independent full-suite re-verification via `qa-reviewer` — **PASS**, see
      above. Confirmed pipeline 12 files/216 tests, app 19 files/200 tests, both builds clean,
      bench maxRelDiff 0.7% (down from 7.0%). No discrepancies from self-reported numbers at
      any step.

**Status: ✅ COMPLETE (10/10 tasks, 2026-07-07).** Fix implemented, verified at every step
(including a caught false self-report at Task 2, matching a known project pattern — see
`HANDOFF.md`), and independently confirmed to measurably close bench's divergence
(7.0%→0.7%), with bonus improvements to pushPull (2.5%→0.3%) and total (1.8%→0.2%) as a
downstream ripple.
