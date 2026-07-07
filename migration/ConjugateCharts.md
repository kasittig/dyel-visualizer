# Core-vs-pipeline parity test for ConjugateCharts

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`
(`@dyel/core` vs `@dyel/pipeline` regression harness for `TotalChart`), an analogous
parity test exists for `ConjugateCharts` at
`packages/app/src/pipeline/conjugateChartParity.test.ts`.

## Context

`ConjugateCharts` is **not** migrated to `@dyel/pipeline` — it still calls
`useConjugateChartData` (which wraps `@dyel/core`'s `buildVariationChartData`)
and imports `LINE_COLORS`/`RepCalcStats` directly from `@dyel/core`.

It was previously migrated to `runPipeline` (via `useConjugateChartData` +
`conjugateChartSpecs(liftType)`), but that migration was **deliberately
reverted** (`46f267f`, "Revert ConjugateCharts from @dyel/pipeline back to
@dyel/core") after this parity test surfaced real divergence between the
legacy and pipeline outputs — see `HANDOFF.md`, Session 6, for the full
writeup.

The pipeline-native replacement wasn't deleted: `conjugateChartSpecs.ts`
(`packages/app/src/pipeline/conjugateChartSpecs.ts`) still exists with no
other importer, kept solely to back this parity test as a documented
regression harness — the same treatment `totalChartSpecs.ts` gets for
`totalChartParity.test.ts`.

Unlike `TotalChart`, there's no single legacy `@dyel/core` function producing
the same date-series shape — the closest legacy analogue is
`VariationRadarChart.tsx`'s `normalizeToBaseE1RM`-based radar snapshot
(last-session-only, not a time series). This parity test instead runs the
real component's legacy path (`buildVariationChartData`) side-by-side with
`conjugateChartSpecs` + `runPipeline` over the same fixture and soft-warns
(`console.warn`, not hard-fail) on divergence, per the intentional-exception
pattern documented in `packages/app/CLAUDE.md`.

## Current state

1. **Pipeline-only sanity tier**: `compareChartSeries` over
   `conjugateChartSpecs(liftType)` output (per-variation + normalized series).
2. **Core-vs-pipeline soft-warn tier**: `it.each` over lift types, diffing
   legacy `buildVariationChartData` output against pipeline output via
   `joinChartPointsByDate`/`diffSeries` from `testUtils/diffChartSeries.ts`.
   Diffs are logged via `console.warn`, not hard-asserted, since real
   normalization divergence between the two implementations is expected and
   tracked separately (this is what motivated the revert above).
3. File: `packages/app/src/pipeline/conjugateChartParity.test.ts`. Reuses
   fixture `test/fixtures/total-chart-sheet.csv`.

## Scoping session (2026-07-07): root-caused divergence

This session re-verified all four root causes of the normalization divergence
via direct testing (`npm test -w packages/app -- conjugateChartParity` and
`totalChartParity`) and code inspection (below). They are independent and
orthogonal; findings #1–#3 are confirmed bugs that differ between implementations;
finding #4 is an unresolved symptom.

**1. Speed-work filtering asymmetry.** Pipeline's `fitNormalizationModel`
(`packages/pipeline/src/derive/normalize.ts`) excludes speed-work sets from the fit
via an `effortOnly` filter; legacy `fitVariantFactor` (`packages/core/src/utils/math/e1rm.ts`)
has no speed-work concept at all and uses every session unfiltered. Skews variant
factors whenever a canonical exercise mixes speed-day and effort-day sets.

**2. minSamples gating.** Pipeline requires `opts.minSamples` sample count before
accepting a fit (no built-in default anywhere — flagged in-code as GitHub issue #429,
"no minSamples default exists anywhere in the legacy codebase"); returns `null`
if unmet. Legacy only requires `factors.length > 0` (i.e., at least 1 sample).
Sparse variants that legacy happily reports get silently dropped on the pipeline side.

**3. Canonical vs. displayName grouping granularity (the largest gap).** Legacy
groups variations by exact logged display-name string (e.g., `"Bench (1 board)"`,
`"Deadlift (2\" deficit, opposite)"`); pipeline groups by canonical slug (e.g.,
`bench-american`, `deadlift-opposite`). Confirmed by re-running the parity test
this session: zero overlap in per-variation vocabulary for squat, bench, _and_
deadlift on the real fixture (`test/fixtures/total-chart-sheet.csv`) — harness's
per-variation intersection is empty for all three lift types. Note: GitHub issue #451
(chain-count/band-tension canonical collapsing, a related narrower bug) is now
CLOSED and confirmed no longer live (checked `packages/pipeline/src/tag/detect/parseExercise.ts`
and `canonical.ts` directly this session) — it narrowed but did not eliminate this
broader gap, exactly as its issue body predicted.

**4. New, unresolved: normalized-series date-overlap anomaly.** The `normalized`
composite series soft-warns "no date overlap" for all three lift types despite both
sides having substantial point counts (squat: legacy 4 / pipeline 13; bench: legacy 22
/ pipeline 22; deadlift: legacy 12 / pipeline 19 points). This is NOT yet root-caused
in this session — likely a downstream symptom of finding #3 (different canonical/label
grouping feeding different session subsets into each side's normalized composite),
but that's a hypothesis, not a confirmed diagnosis. Flag this explicitly as an open
question for whoever picks up the reconciliation work, not something to assume away.

## Before re-attempting the ConjugateCharts migration

Finding #3 (canonical/displayName grouping) has been structurally addressed via
`groupBy: 'label'` field and `buildPointsByLabel` path. However, residual findings
remain unresolved—specifically, missingInA nonzero for squat/deadlift (why do dates
still not overlap even after label-matching?) and finding #4 (the normalized-series
date-overlap anomaly is completely untouched). Do not re-migrate without resolving
these remaining issues — it would risk reintroducing divergence issues, and the root
cause of date misalignment across variants remains undiagnosed.

### Outcome (2026-07-07): findings #1 and #3 addressed

This session closed findings #1 (speed-work filtering asymmetry) and structurally fixed
finding #3 (canonical/displayName grouping), with independent QA verification for each.
Findings #2 and #4 remain unresolved but are now better characterized.

#### Finding #1: Speed-work filtering asymmetry — FIXED

- **Change**: Removed the `effortOnly` filter from `fitNormalizationModel` in
  `packages/pipeline/src/derive/normalize.ts`. Both the baseline grid and per-variant
  fits now use unfiltered records, matching legacy's `fitVariantFactor`/`fitAddlWtOffset`
  exactly.
- **Verification**: `npm test -w packages/pipeline` → 12 files / 188 tests passing
  (post-change); `npm test -w packages/pipeline -- normalize` → 27/27.
- **Note**: `derivers.ts`'s separate use of `isSpeedWork` (per-day e1rm derivation) was
  deliberately left untouched and is out of scope.

#### Finding #2: minSamples gating — DOWNGRADED, not a live issue

- **Re-investigation result**: `packages/pipeline/src/pipeline.ts` hardcodes
  `MIN_SAMPLES = 1` for production `runPipeline` calls. Legacy's own gating
  (`factors.length === 0` rejection) is equivalent to requiring `n >= 1` — both sides
  already agree at n=1 in production.
- **Conclusion**: Never actually contributing to the divergence; this session was not a
  reconciliation blocker. GitHub issue #429 (no principled default anywhere in
  `@dyel/core`) remains valid as separate design smell, not in scope here.

#### Finding #3: Canonical vs. displayName grouping mismatch — STRUCTURALLY FIXED

- **Changes**:
  - Added opt-in `groupBy: 'label'` field to `SeriesSpec`
    (`packages/pipeline/src/dataset/build.ts`).
  - Added parallel `buildPointsByLabel` construction path
    (`packages/pipeline/src/pipeline.ts`) that groups by `r.meta?.rawExercise` (the raw
    logged exercise string, already preserved on every `TaggedSetRecord`).
  - Wired into `packages/app/src/pipeline/conjugateChartSpecs.ts`'s `variations` spec.
- **Verification**: `npm test -w packages/app -- conjugateChartParity` → 8/8 passing,
  with previously-empty per-variation intersection now populated:
  ```
  core-vs-pipeline squat Box Squat: compared=2 missingInA=1 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (American Bar): compared=1 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=1.0%
  core-vs-pipeline bench Bench (American Bar, CG): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline deadlift Deadlift (opposite): compared=2 missingInA=2 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  ```
- **Non-promotion decision**: Did NOT add hard-asserts for these matches. Sample sizes
  are n=1–2 per matched series—too sparse to treat as proven parity. Additionally,
  squat and deadlift both show nonzero `missingInA`, indicating date misalignment
  persists even after label-matching fixed the vocabulary gap. This aligns with
  precedent from `HANDOFF.md` Session 4, which only hard-asserted deadlift baseline
  identity once robustly confirmed on real data, leaving numeric fitting divergence as
  soft-warn.
- **New residual open question**: Why does `missingInA` remain nonzero for
  squat/deadlift even after label-matching fixed the vocabulary gap? Not investigated
  this session—flag as a follow-up.

#### Finding #4: Normalized-series date-overlap anomaly — STILL UNRESOLVED, UNCHANGED

- **Status**: Re-verified post-fixes for findings #1 and #3. Still shows "no date
  overlap" for all three lift types with same point counts as originally recorded (squat:
  legacy 4 / pipeline 13; bench: legacy 22 / pipeline 22; deadlift: legacy 12 /
  pipeline 19).
- **Scope boundary**: The `groupBy: 'label'` fix was deliberately scoped to the
  `variations` spec only, NOT the `normalized` composite spec (composites intentionally
  aggregate across variants—that's correct). Finding #4 is completely untouched and
  remains fully open.

### Follow-up session (2026-07-07): missingInA root-caused

Picked up the residual open question from Finding #3 above ("why does `missingInA`
remain nonzero for squat/deadlift even after label-matching fixed the vocabulary gap?").
Root-caused and confirmed against ground truth (re-ran
`npm test -w packages/app -- conjugateChartParity` via `qa-reviewer`, matches exactly:
squat `Box Squat` compared=2/missingInA=1, deadlift `Deadlift (opposite)`
compared=2/missingInA=2).

**Root cause: day-level effort/volume filtering asymmetry (new finding, call it #5).**

- Legacy's `splitByEffort` (`packages/app/src/utils/appDataUtils.ts`) classifies every
  logged row as `maxEffort` (`session.sets === 1 || session.rpe !== null`) or `volume`
  (multi-set, no RPE) **before** `buildVariationChartData` ever runs. Only `maxEffort`
  rows reach the variation chart — volume-only days for a given variation are dropped
  entirely, not just deprioritized.
- Pipeline's `derivers.ts` `e1rm` deriver never drops a day. It filters out speed-work
  sets (`isSpeedWork`: no RPE, 2+ sets) when picking the day's best set, but **falls back
  to the speed-work sets themselves** if a day has no effort sets at all (`usable =
effortSets.length ? effortSets : sets`) — so a day that legacy would classify as pure
  `volume` and exclude still produces a real e1RM point on the pipeline side.
- `conjugateChartSpecs.ts`'s `variations` spec has no analogue of this day/session-level
  split — its `include` predicate only filters by `lift:${liftType}` tag. There is no
  pipeline-side tag or filter expressing "max-effort day" at all.
- **Confirmed directly against the fixture** (`test/fixtures/total-chart-sheet.csv`):
  - `Box Squat`: 2/2/2026 (sets=1 → maxEffort) and 6/8/2026 (sets=1 → maxEffort) are the
    only two legacy-visible dates. 2/6/2026 (sets=5, no RPE → volume, legacy drops it)
    still produces a pipeline point via the deriver's fallback (no effort sets that day)
    → exactly 1 extra pipeline-only date → `missingInA=1`.
  - `Deadlift (opposite)`: legacy-visible dates are 3/9/2026 (sets=1) and 5/4/2026 (has
    both a sets=1/weight=250 maxEffort row and a sets=2/weight=175 volume row on the same
    day — legacy and pipeline agree here since the deriver also prefers the effort set
    when one exists). 2/6/2026 (sets=8, no RPE) and 3/6/2026 (sets=6, no RPE) are pure
    volume days legacy drops entirely, but the deriver's fallback still produces points
    for both → exactly 2 extra pipeline-only dates → `missingInA=2`.
- **Not fixed this session** — this is a genuine behavioral gap (not a bug in either
  implementation individually), and closing it means deciding pipeline-side design: e.g.
  a new day-level "effort" concept (tag or filter) mirroring legacy's `splitByEffort`, so
  `conjugateChartSpecs.ts` can exclude volume-only days from the `variations` spec the
  same way legacy does. This is an architecture decision in the same class as Findings
  #1 and #3 (both required explicit user sign-off before implementation) — flagged for
  sign-off, not implemented speculatively.
- **Relationship to Finding #4**: likely a contributing (not necessarily sole) cause of
  the `normalized` composite's date-overlap anomaly too, since the composite spec draws
  from the same unfiltered day set — still a hypothesis, not confirmed for that spec.

### Finding #5 fix: `e1rm-max-effort` deriver implemented (2026-07-07, second follow-up)

A teammate implemented the day-level "max-effort" concept flagged as needing sign-off in
Finding #5 and Task 6b (`SPECIFICATIONS.md`): a new `'e1rm-max-effort'` deriver id in
`packages/pipeline/src/derive/derivers.ts`. Unlike `e1rm` (which falls back to computing
an e1RM from speed-work sets when a day has none of its own max-effort sets), `e1rm-max-effort`
filters to max-effort sets (single-set entries, or any set with an explicit RPE) via the
existing `isSpeedWork` predicate and returns `null` — not a fallback value — for a day with
no max-effort sets. Callers (`pipeline.ts`/`dataset/build.ts`, already updated by the
teammate) exclude that day's point entirely rather than zero-filling it, mirroring legacy's
`splitByEffort` day-level exclusion exactly.

This session wired the new deriver into `packages/app/src/pipeline/conjugateChartSpecs.ts`,
changing `derive` from `'e1rm'` to `'e1rm-max-effort'` on **both** the `variations` series
spec and the `normalized` composite spec — not just `variations` — because legacy's
`buildVariationChartData` (`packages/core/src/load/buildVariationChartData.ts`) computes
both its per-variation series and its `normalizedByDate`/`__normalized__` composite from the
exact same `maxEffort`-filtered `rows` parameter. `CompositeSpec.derive` in
`packages/pipeline/src/dataset/build.ts` was already typed as `string` (not narrowed to the
`'e1rm'` literal), so no type-widening work was needed; `npm run build -w packages/app`
passed cleanly with no changes required beyond the two `derive` field edits.

**Real before/after numbers** (`npm test -w packages/app -- conjugateChartParity`, 8/8 passing
both before and after):

Before (baseline, prior session):

```
core-vs-pipeline squat Box Squat: compared=2 missingInA=1 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline squat normalized: no date overlap (legacy has 4 points, pipeline has 13 points)
core-vs-pipeline bench Bench (American Bar): compared=1 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=1.0%
core-vs-pipeline bench Bench (American Bar, CG): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline bench normalized: no date overlap (legacy has 22 points, pipeline has 22 points)
core-vs-pipeline deadlift Deadlift (opposite): compared=2 missingInA=2 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline deadlift normalized: no date overlap (legacy has 12 points, pipeline has 19 points)
```

After (this session, real run output, verbatim):

```
core-vs-pipeline squat Box Squat: compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline squat normalized: no date overlap (legacy has 4 points, pipeline has 4 points)
core-vs-pipeline bench Bench (American Bar): compared=1 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=1.0%
core-vs-pipeline bench Bench (American Bar, CG): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline bench normalized: no date overlap (legacy has 22 points, pipeline has 22 points)
core-vs-pipeline deadlift Deadlift (2" deficit): compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline deadlift normalized: no date overlap (legacy has 12 points, pipeline has 12 points)
```

**Observed improvements:**

- Squat `Box Squat` `missingInA` dropped from 1 to 0 — exactly the hypothesized fix; the pure
  volume day (2/6/2026) that pipeline previously fallback-derived a point for is now correctly
  excluded, matching legacy's day count.
- Deadlift's matched variation initially appeared to change from `Deadlift (opposite)`
  (previously `missingInA=2`) to `Deadlift (2" deficit)` (`missingInA=0`) after this fix.
  **Investigated further and root-caused as a separate, pre-existing test-harness bug**, not a
  data regression: `conjugateChartParity.test.ts` computed `pipelineVariationKeys` from
  `Object.keys(pipeline.variations[0] || {})` — only the FIRST row's (earliest date's) keys,
  not the union of variation columns across all rows. Since most dates in this wide-format
  series only have one variation logged, this meant the "intersection" check was only ever
  accidentally comparing whichever single variation happened to be logged on the earliest
  surviving date, not a true intersection. Confirmed directly by running the pipeline
  standalone: `Deadlift (opposite)` was present all along at 2026-03-09 (235) and 2026-05-04
  (250) — correct, undropped data — it just no longer sorted into row 0 after this session's
  fix shifted which date is earliest. **Fixed the harness bug**: changed the key extraction to
  `pipeline.variations.flatMap((row) => Object.keys(row)).filter((k) => k !== 'date')` (union
  across all rows). No hard-assert regressions from this fix — all 8 tests still pass,
  including the newly-surfaced `Deadlift (opposite)` match (`compared=2, maxAbsDiff=0`).
- **With the harness bug fixed, per-variation parity is dramatically better than originally
  scoped.** Every matched variation across all three lift types now shows `missingInA=0,
missingInB=0` — full date-level parity on every per-variation series checked, real numbers
  (verbatim, independently re-verified via `qa-reviewer`):
  ```
  core-vs-pipeline squat Belt Squat (narrow stance): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline squat Box Squat: compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline squat Squat: compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench: compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (1 board): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (2 board): compared=3 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (American Bar): compared=1 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=1.0%
  core-vs-pipeline bench Bench (American Bar, CG): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (CG): compared=1 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.8%
  core-vs-pipeline bench Bench (Duffalo): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (Slingshot): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (Slingshot, chain): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (bands): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (chain): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Bench (commands): compared=2 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.7%
  core-vs-pipeline bench Bench Builder: compared=5 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Floor Press: compared=2 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.7%
  core-vs-pipeline bench Floor Press (Swiss bar): compared=1 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.8%
  core-vs-pipeline bench Floor Press (chain): compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline bench Incline Bench: compared=1 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=1.1%
  core-vs-pipeline deadlift Deadlift: compared=2 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.4%
  core-vs-pipeline deadlift Deadlift (2" block): compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline deadlift Deadlift (2" deficit): compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline deadlift Deadlift (2" deficit, opposite): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline deadlift Deadlift (bands): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline deadlift Deadlift (light rev. bands): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline deadlift Deadlift (mini rev. bands): compared=1 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  core-vs-pipeline deadlift Deadlift (opposite): compared=2 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
  ```
  Remaining `maxAbsDiff`/`maxRelDiff` on a handful of bench/deadlift series (all ≤1.1%) are
  pre-existing rounding-level divergence already documented in earlier sessions, not a new
  finding — none of it is date-alignment (`missingInA`/`missingInB` are 0 across the board).
- All three `normalized` composites: pipeline's point count now exactly matches legacy's
  (squat 4/4, bench 22/22, deadlift 12/12) instead of over-producing (previously 13, 22, 19).
  This is a real, verified narrowing of Finding #4's symptom (the composite spec now also
  excludes non-max-effort days, so point counts align) — but the "no date overlap" warning
  itself is UNCHANGED: even with matching counts, `diffSeries`/`joinChartPointsByDate` still
  reports zero comparable dates for all three lift types. Finding #4's root cause (why the
  actual date VALUES don't align, not just counts) remains open and unconfirmed — do not treat
  this as closed. Given how thoroughly Finding #5 turned out to explain the per-variation
  divergence, Finding #4 is now the clear priority for a follow-up session.
- No regressions observed: no previously-passing hard-assert failed, and no `maxAbsDiff`/
  `maxRelDiff` got worse for any series.

**Full regression suite** (`npm run build -w packages/pipeline && npm run build -w packages/app
&& npm test -w packages/pipeline && npm test -w packages/app`, all green):

- `npm run build -w packages/pipeline`: clean, exit 0.
- `npm run build -w packages/app`: clean, exit 0.
- `npm test -w packages/pipeline`: **12 files / 195 tests**, all passing (up from 12/188 —
  the teammate's `e1rm-max-effort` deriver work added tests, notably `derivers.test.ts` now
  26 tests).
- `npm test -w packages/app`: **19 files / 200 tests**, all passing — identical file/test
  counts to the pre-session baseline, confirming zero regressions elsewhere in the app suite
  (this count includes the harness-bug fix to `conjugateChartParity.test.ts`, a one-line
  change to the variation-key-extraction logic, not a new test file).

**Component swap-over status: still NOT done.** `ConjugateCharts.tsx` and
`useConjugateChartData.ts` remain on `@dyel/core`; this session only updated
`conjugateChartSpecs.ts` (the parity-test-only pipeline-native replacement) and re-verified
parity numbers. Per-variation matches were deliberately left as soft-warn, not promoted to
hard-assert — same n=1-2 sample-size rationale as prior sessions.

#### Components NOT yet swapped

**Critical clarification**: `ConjugateCharts.tsx` and `useConjugateChartData.ts`
themselves remain on `@dyel/core`. This session's work narrowed the underlying
divergence but did not attempt or complete the actual component swap-over. That is a
distinct, not-yet-started follow-up task for whoever picks up Phase 4 in
`MIGRATION_PLAN.md` next.

### Finding #4 resolved: test-harness key-name bug, not real divergence (2026-07-07, third follow-up)

Picked up Open TODO #1 from `HANDOFF.md` (root-cause Finding #4's "no date overlap"
anomaly on the `normalized` composite, which persisted even after Finding #5's fix made
legacy/pipeline point counts match exactly for all three lift types).

**Root cause: another test-harness bug, structurally identical in spirit to the
`pipelineVariationKeys` bug fixed alongside Finding #5.** `conjugateChartParity.test.ts`'s
`beforeAll` renames the pipeline composite's output key to `NORMALIZED_KEY`
(`__normalized__`) before diffing against legacy, via:

```ts
if (liftType in point) {
  point[NORMALIZED_KEY] = point[liftType];
  delete point[liftType];
}
```

This assumed the composite's `RechartsRow` key was the lift type string (e.g. `'squat'`).
It is not: `conjugateChartSpecs.ts`'s `normalized` spec has `id: 'normalized'`, and
`packages/pipeline/src/dataset/build.ts`'s composite branch pushes rows keyed by
`spec.id` (`rows.push({ t, [spec.id]: ... })`) — i.e. the literal string `'normalized'`,
not `liftType`. So `liftType in point` was always `false`, the rename never happened, and
every `diffSeries(joined, NORMALIZED_KEY)` call found no value on the pipeline side for
any date — misreporting "no date overlap" for all three lift types even when the
underlying dates were fully aligned.

**Confirmed via a standalone debug script before touching the test**: for squat, both
legacy and pipeline `normalized` series independently produced the identical date set
(`2026-02-02`, `2026-03-02`, `2026-06-08`, `2026-06-22`), proving Finding #4 was never a
real data-alignment problem — the harness itself was comparing against the wrong key and
silently reporting a false negative on every date.

**Fix**: changed the check to `'normalized' in point` (matching the composite spec's
actual `id`), updated the two stale comments above it accordingly. One file touched:
`packages/app/src/pipeline/conjugateChartParity.test.ts`. No production/pipeline code
changed — this was purely a test-harness defect.

**Real before/after numbers** (`npm test -w packages/app -- conjugateChartParity`, 8/8
passing both before and after):

Before (masked by the bug):

```
core-vs-pipeline squat normalized: no date overlap (legacy has 4 points, pipeline has 4 points)
core-vs-pipeline bench normalized: no date overlap (legacy has 22 points, pipeline has 22 points)
core-vs-pipeline deadlift normalized: no date overlap (legacy has 12 points, pipeline has 12 points)
```

After (real comparison, unmasked):

```
core-vs-pipeline squat normalized: compared=4 missingInA=0 missingInB=0 maxAbsDiff=0 maxRelDiff=0.0%
core-vs-pipeline bench normalized: compared=22 missingInA=0 missingInB=0 maxAbsDiff=17 maxRelDiff=9.8%
core-vs-pipeline deadlift normalized: compared=12 missingInA=0 missingInB=0 maxAbsDiff=14 maxRelDiff=5.1%
```

**New residual finding, not yet root-caused (call it Finding #6): squat's `normalized`
composite is exact (0% diff), but bench (9.8%) and deadlift (5.1%) show real,
previously-invisible value divergence.** This was always present in the underlying data —
the bug only prevented it from ever being measured — so it is not a regression introduced
by this session's fix, but it is a genuinely new open item. Not investigated this session
beyond confirming the numbers via independent `qa-reviewer` re-verification; likely
candidates given the project's established divergence patterns (per-variant normalization
factor fitting, canonical vs. label grouping feeding the composite differently than the
per-variation series) but unconfirmed — flag as the next priority, do not assume a cause.

**No regressions**: full suite green — `npm test -w packages/pipeline` 12 files/195 tests,
`npm test -w packages/app` 19 files/200 tests (both builds clean), identical counts to the
pre-session baseline (only a 5-line change to one existing test file, no new tests added).
Independently re-verified via `qa-reviewer`.

## Verification

`npm test -w packages/app -- conjugateChartParity`
