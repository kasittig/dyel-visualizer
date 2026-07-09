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
Finding #5 and Task 6b (tracked in `HANDOFF.md`, formerly `SPECIFICATIONS.md`): a new
`'e1rm-max-effort'` deriver id in
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

### Finding #6 root-caused (2026-07-07, fourth follow-up): addlWtOffset never wired into pipeline normalization

Picked up Open TODO #1 from `HANDOFF.md` (root-cause Finding #6: bench 9.8%/deadlift 5.1%
`normalized`-composite value divergence from legacy, while squat is exact).

**Two hypotheses were tested empirically via throwaway debug scripts (deleted after use,
same pattern as the Finding #4 session) before writing up a conclusion:**

1. **Canonical-vs-label grouping mismatch (initial hypothesis, FALSIFIED).** `CompositeSpec`
   has no `groupBy` field (confirmed in `packages/pipeline/src/dataset/build.ts`), so
   Finding #3's `groupBy: 'label'` fix — deliberately scoped only to the `variations`
   series — never reached the `normalized` composite, which always normalizes via
   canonical-level `variantFactor`. This looked like a plausible explanation (legacy fits
   one factor per exact display-name label; pipeline fits one per canonical). **Directly
   disproven** by printing the real fixture's label→canonical fan-out per lift type:
   squat (6 canonicals, all 1:1 with their label), deadlift (8 canonicals, all 1:1), and
   bench (17 canonicals, all 1:1 **except** `bench-board` which pools `Bench (1 board)`
   and `Bench (2 board)`, n=2). Only one canonical, in one lift type, has any label
   fan-out at all — nowhere near enough to explain a 9.8% whole-composite divergence, and
   it doesn't explain deadlift's 5.1% divergence at all (deadlift has zero fan-out).
2. **Baseline-identity mismatch (second hypothesis, FALSIFIED).** Printed legacy's
   `effectiveBaselineNames` (from `computeEffectiveNames`) against pipeline's
   `PipelineResult.model.baseline['lift:<type>']` for all three lift types on the real
   fixture: squat (`Squat` / `squat`), bench (`Bench (commands)` / `bench-pause` — the
   same exercise, confirmed via the canonical→label map from hypothesis 1), deadlift
   (`Deadlift` / `deadlift`). All three agree exactly. Baseline choice is not the cause.

**Real root cause (confirmed via code + fixture evidence, not speculation):**
**pipeline's `fitNormalizationModel`/`normalizeE1rm` (`packages/pipeline/src/derive/normalize.ts`)
never wires `addlWtOffset` (the chain/band weight correction) into either the
per-variant-factor FIT or the per-point normalization APPLY step — for any exercise, ever.**
Contrast with legacy:

- **Fit-time**: `packages/core/src/utils/stats/sessionIndex.ts`'s `buildSessionStats` calls
  `applyAddlWtOffset(familySessions, data.sessions)` for every addlWt exercise _before_
  calling `fitVariantFactor(baselineSessions, adjustedSessions)` — i.e. legacy's
  `variantFactor` for e.g. `Bench (chain)` is fit on chain-tension-corrected weights.
  Pipeline's `fitNormalizationModel` (`normalize.ts:160`) computes `variantFactor` via
  `fitMetric(grid, r, (p, rec) => calcE1RM(rec.weight, ...) / p)` using `rec.weight`
  **raw**, un-offset, for every exercise including addlWt ones. Pipeline does separately
  compute an `addlWtOffset` model field (`normalize.ts:165-169`), but it is fit
  independently and never feeds back into the `variantFactor` fit the way legacy's
  `adjustedSessions` does.
- **Apply-time**: legacy's `normalizeToBaseE1RM`
  (`packages/core/src/utils/stats/repCalculator.ts`) explicitly adjusts a session's e1RM
  by `addlWtOffset` before dividing by `variantFactor` whenever source or target carries
  addlWt (both the same-family branch, lines 98-108, and the cross-family branch, lines
  115-121). Pipeline's `normalizeE1rm`/`getFactor` (`normalize.ts:177-182`) is a bare
  `e1rmKg / f` — `model.addlWtOffset` is never read by either function. It is computed
  and stored on `NormalizationModel` but is currently **dead data**, not consumed by any
  normalization path.

**This lines up exactly with the observed per-lift divergence magnitude**, confirmed via
the label→canonical fixture dump: squat has **zero** addlWt (chain/band) variants among
its 6 canonicals → 0% divergence (nothing triggers the gap). Bench has **5 of 16**
non-baseline canonicals carrying addlWt (`bench-floor-chains`, `bench-swiss-chains`,
`bench-slingshot-chains`, `bench-chains`, `bench-bands-unspecified`) → largest divergence
(9.8%). Deadlift has **3 of 6** non-baseline canonicals carrying addlWt
(`deadlift-bands-unspecified`, `deadlift-rev-bands-light`, `deadlift-rev-bands-mini`) →
moderate divergence (5.1%). The proportion of addlWt-carrying variants per lift type
tracks the divergence magnitude directly.

**Not fixed this session** — closing this requires deciding how pipeline should
incorporate `addlWtOffset` into `fitNormalizationModel`'s fit step and `normalizeE1rm`'s
apply step (mirroring legacy's two-sided correction), which is an architecture decision in
the same class as Findings #1 and #3 (both required explicit user sign-off before
implementation) — flagged for sign-off, not implemented speculatively. Note this is a
**pipeline-level** fix (`packages/pipeline/src/derive/normalize.ts`), not scoped to
`ConjugateCharts` alone — any other composite consuming addlWt-tagged canonicals (there
are none yet, but `TotalChart`'s composite could in principle) would have the same latent
gap once it includes addlWt-carrying variants.

**No regressions**: no production code changed this session — root-cause investigation
only, via two throwaway debug test files (`_debug_finding6.test.ts`), both deleted after
use. `npm test -w packages/app -- conjugateChartParity` unchanged (8/8 passing).

### Finding #6 fixed (2026-07-07, fifth follow-up): Design B — fit-time + apply-time addlWtOffset wiring

User sign-off obtained on **Design B** (full two-sided mirror of legacy's correction), with
one refinement discovered mid-implementation that shrank the change's blast radius:
`normalizeE1rm`/`projectToVariant` did **not** need a signature change to accept raw
weight/reps, because legacy's `repCalculator.ts` `findBestE1RM` already applies
`addlWtOffset` in **e1RM-space** (not weight-space) at the exact same aggregated
per-canonical abstraction level pipeline's `Point`/`NormalizationModel` operate at — a
documented legacy approximation ("approximation valid because offset and e1RM share the
same weight unit"), not an invented shortcut. Only `normalizeToBaseE1RM` (a different
legacy function, operating on raw per-session `TrainingSession` objects) does the
weight-space correction, and pipeline has no equivalent raw-session-level call site to
mirror that at (`Point.v` is already a derived, day-collapsed e1RM by the time it reaches
`normalizeE1rm`).

**Changes** (`packages/pipeline/src/derive/normalize.ts`, implemented by a teammate,
independently QA-verified):

- **Fit-time**: `fitNormalizationModel` now fits `addlWtOffset` first for each addlWt-tagged
  canonical, then — if the offset fit met `minSamples` — offset-adjusts that canonical's
  records (`weight += offsetKg`, via immutable copies) before fitting `variantFactor`,
  mirroring `sessionIndex.ts`'s `applyAddlWtOffset`-before-`fitVariantFactor` sequencing.
  Non-addlWt canonicals are unaffected (unchanged code path).
- **Apply-time**: `normalizeE1rm(can, e1rmKg, model)` now adds `model.addlWtOffset[can]?.offsetKg`
  to `e1rmKg` before dividing by `factor` (variant→baseline direction). `projectToVariant(baseE1rmKg,
targetCan, model)` now subtracts `model.addlWtOffset[targetCan]?.offsetKg` after multiplying
  by `factor`, clamped to `Math.max(0, ...)` (baseline→variant direction — exact mirror of
  `findBestE1RM`'s `e1rm = compE1RM * vf.factor; e1rm -= off.offset`). No signature change to
  either function.

**Real before/after numbers** (`npm test -w packages/app -- conjugateChartParity`,
independently re-verified via `qa-reviewer`):

```
core-vs-pipeline squat normalized: compared=4  maxRelDiff=0.0%  (before: 0.0%, unchanged)
core-vs-pipeline bench normalized: compared=22 maxRelDiff=7.0%  (before: 9.8%)
core-vs-pipeline deadlift normalized: compared=12 maxRelDiff=0.4% (before: 5.1%)
```

Bench and deadlift both narrowed substantially (deadlift is now near-exact); neither closed
to 0%, which is expected — Design B mirrors legacy's own documented e1RM-space
_approximation_, not an exact weight-space correction, so some residual divergence from that
approximation itself is inherent to legacy's own math, not a pipeline bug. Not treated as a
new open finding — it's the expected ceiling of the approximation both implementations now
share.

**TotalChart cross-check (per explicit user request, closing Open TODO #5)**: verified
empirically, not assumed — `totalChartSpecs.ts`'s composite queries (e.g. `include: { all:
['lift:bench'] }`) are unfiltered by addlWt and pull in the same chain/band canonicals from
the same shared fixture (`total-chart-sheet.csv`) `ConjugateCharts` uses. Confirmed via a
before/after `git stash` bisection of the fix (stash → rebuild → `totalChartParity` →
restore → rebuild) that `TotalChart`'s bench/deadlift numbers were previously **identical**
to `ConjugateCharts`' pre-fix Finding #6 numbers (9.8%/5.1%), and after the fix:

```
core-vs-pipeline bench: maxRelDiff=7.0% (before: 9.8%)
core-vs-pipeline deadlift: maxRelDiff=2.7% (before: 5.1%)
core-vs-pipeline total: maxRelDiff=1.8% (before: 2.9%)
core-vs-pipeline squat: maxRelDiff=0.7% (before: 0.7%, unaffected — no addlWt squat canonicals)
```

So `TotalChart` benefited automatically from the shared `packages/pipeline/src/derive/normalize.ts`
fix, exactly as anticipated — no `TotalChart`-specific code change was needed, confirming
this was correctly scoped as a pipeline-level fix, not a `ConjugateCharts`-only one. (An
initial automated QA pass incorrectly reported TotalChart's fixture as addlWt-free; this was
caught and corrected by direct fixture inspection plus the stash-bisection numbers above —
flagging here since it's a good example of why this project's convention is to verify
divergence claims empirically rather than trust a plausible-sounding summary.)

**Verification**: `npm run build -w packages/pipeline && npm run build -w packages/app &&
npm test -w packages/pipeline && npm test -w packages/app` — all green. Pipeline: 12
files/203 tests (up from 195 — 8 new tests covering fit-time offset-adjustment and
apply-time add/subtract behavior, including regression coverage that non-addlWt canonicals
are untouched). App: 19 files/200 tests (unchanged — no new test files, only the shared
pipeline fix consumed by existing parity tests). No regressions.

**Component swap-over status: still NOT done.** `ConjugateCharts.tsx`/`useConjugateChartData.ts`
remain on `@dyel/core`. Finding #6 is now fixed (not just root-caused), which was the last
blocker flagged in "Before re-attempting" above — the actual swap-over is the next step for
whoever picks up Phase 4 next, but was out of scope for this session (Task 10 was fix-only,
per the original task breakdown).

## Wire-verify-revert dry run (2026-07-08)

Per explicit direction, this session fully wired `useConjugateChartData.ts`/
`ConjugateCharts.tsx` onto `runPipeline` + `conjugateChartSpecs(liftType)` (removing the
`buildVariationChartData`/`LINE_COLORS`/`RepCalcStats` `@dyel/core` imports) as a live
verification exercise, not a committed swap — the same numbers documented above (Finding
#6 fixed: squat 0.0%, bench 7.0%, deadlift 0.4% `normalized`-composite divergence;
per-variation series `missingInA=0`/`missingInB=0` across the board) were reconfirmed
against a real end-to-end wiring, not just the standalone `conjugateChartSpecs` harness.
`npm test -w packages/app -- conjugateChartParity` (4/4) and the full suite (`npm test -w
packages/app`, 199/199) passed with the swap live, and `npm run build -w packages/app`
succeeded.

**Both files were reverted to their pre-dry-run `@dyel/core`-calling state immediately
after verification** (confirmed via `git status --porcelain` showing no diff) — this was
a verification-only pass, not a component swap-over. The migration gate at the top of
`APP_COMPONENTS.md` (exact match required, not soft-warn) is still not met: bench's 7.0%
and deadlift's 0.4% `normalized`-composite divergence remain soft-warned, not hard-
asserted, per the same n=1-5 sample-size rationale as prior sessions. The actual
swap-over is still not done; this dry run only re-confirms it would be low-risk once the
gate is met.

## Verification

`npm test -w packages/app -- conjugateChartParity`

## Test-harness bug fix (2026-07-08, follow-up)

During a follow-up session, prior sessions' documented parity numbers in
`conjugateChartParity.test.ts` were discovered to be stale. A re-run against a
later commit showed drastically degraded residuals: squat 31.4% / bench 21.5% /
deadlift 25.4% `normalized`-composite maxRelDiff — appearing as a huge
regression from the 0.0%/7.0%/0.4% baseline documented in the Finding #6 fix
session above.

### Root cause: test-harness input filtering bug

Root cause analysis via bisection and production data-flow tracing identified
this as a **test-harness bug, not a pipeline regression**.

`conjugateChartParity.test.ts`'s `beforeAll` called `buildSessionStats(pairs,
...)` using the **raw, unfiltered pair list** extracted from the fixture,
identical to how the fixture was originally loaded. However, real production
code (`App.tsx` → `LiftTabPanel.tsx` → `useLastSessionStats`) always calls
`buildSessionStats` with **max-effort-only rows** after filtering via
`splitByEffort` (mirroring the `e1rm-max-effort` deriver gate applied to
pipeline calculations).

This was an asymmetry: the legacy side (`buildVariationChartData`) was receiving
only `maxEffort` rows, while the harness was feeding it unfiltered raw data —
amplifying every fitting divergence. By contrast, `totalChartParity.test.ts`
already implemented the correct pattern via its `allSigmaPairs` construction,
filtering to max-effort rows before passing to `buildSessionStats`. The
`conjugateChartParity.test.ts` file was the outlier — a test-harness structural
defect, not a pipeline-vs-legacy divergence.

### Fix applied

Changed `conjugateChartParity.test.ts`'s `beforeAll` to build `allSigmaPairs`
(max-effort-only rows extracted from `tabRows.squat.maxEffort` +
`tabRows.bench.maxEffort` + `tabRows.deadlift.maxEffort`, exactly mirroring
`totalChartParity.test.ts`'s existing pattern) and pass that into
`buildSessionStats` instead of the raw `pairs` array.

### Corrected parity numbers (post-fix)

Full test run with fix applied, all 4 conjugateChartParity tests passing:

- **squat**: 0.0% maxRelDiff on `normalized` and all per-variation series
- **bench**: 0.7% maxRelDiff on `normalized` and the `Bench` series itself;
  per-variation range 0.0%-1.1% (e.g. Incline Bench 1.1%, American Bar 1.0%,
  CG 0.8%, Floor Press/Floor Press Swiss bar 0.7-0.8%, most others 0.0%)
- **deadlift**: 0.4% maxRelDiff on `normalized` and the `Deadlift` series
  itself; all other per-variation series 0.0%

**Critical observation**: These corrected numbers **exactly match**
`totalChartParity.test.ts`'s documented residual baseline (squat 0.0%, bench
0.7%, deadlift 0.4%, pushPull 0.2%, total 0.0%). This is strong confirmation
that the stale numbers in `conjugateChartParity.test.ts` were a test artifact,
not a real pipeline-vs-legacy gap unique to `ConjugateCharts`. The parity test
had been silently measuring against garbage input the whole time.

### Full verification

```
npm run build -w packages/pipeline && npm run build -w packages/app && npm test -w packages/pipeline && npm test -w packages/app
```

All green. Pipeline: 12 files / 144 tests. App: 24 files / 236 tests. No
regressions.

### Gate status decision point (NOT DECIDED HERE)

Per `APP_COMPONENTS.md`'s migration gate ("pipeline and @dyel/core backends
must produce _exactly_ matching output... not soft-warn tolerance"), bench
(0.7%) and deadlift (0.4%) are still non-zero on the `normalized` composite.
The exact-match gate is technically **NOT met**, even though the numbers now
match `TotalChart`'s accepted residual baseline and the per-variation series
show full date-level parity (all `missingInA=0`/`missingInB=0`).

**Decision point for next maintainer/session**: either (a) treat the 0.7%/0.4%
residual as the same already-accepted-and-precedented divergence that
`TotalChart` carries (both implementations' documented e1RM-space approximations
for `addlWtOffset` correction), and formally promote these numbers as the new
gate baseline (soft-acceptance, matching TotalChart's model), or (b) continue
treating them as non-zero and gate-failing, leaving the swap-over deferred
pending either further pipeline refinement or explicit architectural decision to
accept the approximation gap as acceptable.

Do not treat this as a recommendation one way or another — both options are
factually defensible. State this explicitly in any swap-over decision doc.
