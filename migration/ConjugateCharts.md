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

#### Components NOT yet swapped

**Critical clarification**: `ConjugateCharts.tsx` and `useConjugateChartData.ts`
themselves remain on `@dyel/core`. This session's work narrowed the underlying
divergence but did not attempt or complete the actual component swap-over. That is a
distinct, not-yet-started follow-up task for whoever picks up Phase 4 in
`MIGRATION_PLAN.md` next.

## Verification

`npm test -w packages/app -- conjugateChartParity`
