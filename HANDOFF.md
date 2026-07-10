# HANDOFF: VariationRadarChart cross-exercise normalization (baseline-only)

## Background

`VariationRadarChart` currently plots each variation's **raw, un-normalized** e1RM
(deprecated cross-exercise normalization during the #460 pipeline swap — see
`migration/VariationRadarChart.md`). This effort reintroduces normalization using
`@dyel/pipeline`'s existing `NormalizationModel`/`normalizeE1rm` primitive (already used
by `ConjugateCharts`' `normalized` composite), scoped to **baseline-only** normalization
(the model's fixed lift-family competition canonical), not the old arbitrary-target
dropdown (which stays deprecated per `ConjugateCharts.md`'s #459 precedent).

Full scoping/rationale is in the conversation that produced this handoff; short version:

- Pipeline math already exists (`packages/pipeline/src/derive/normalize.ts`); this is a
  wiring + UI + test task, not new pipeline primitive work.
- Known, precedented residual: squat 0.0%, bench 0.7%, deadlift 0.4% (`addlWtOffset`
  e1RM-space approximation), already accepted by `TotalChart`/`ConjugateCharts` as
  soft-warn, not hard-assert.
- Explicitly OUT of scope: arbitrary per-variant target selection (would require a
  variant→variant normalization path, which `packages/pipeline/src/derive/CLAUDE.md`
  currently forbids by design — flag, don't build, if this comes up).

## Task list

- [ ] Task 1: Add `canonicalByLabel: Map<string,string>` resolution to
      `usePipelineVariationRadarData` (Target:
      `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.ts`, Test:
      `npx vitest run src/hooks/pipeline/usePipelineVariationRadarData.test.ts`)
- [ ] Task 2: Add `snapshotNormalizedVariationsFromPipeline` to `variationSnapshot.ts`
      (Target: `packages/app/src/utils/variationSnapshot.ts`, Test:
      `npx vitest run src/utils/variationSnapshot.test.ts`)
- [ ] Task 3: Wire normalized snapshot into the hook + `VariationRadarChart` UI (second
      radar series + tooltip line) (Target:
      `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.ts`,
      `packages/app/src/components/charts/VariationRadarChart.tsx`,
      `packages/app/src/components/charts/BaseRadarChart.tsx`, Test: full app suite +
      `tsc -b`) — blocked by Tasks 1, 2
- [ ] Task 4: Add normalized-path parity test coverage, soft-warn tier (Target:
      `packages/app/src/pipeline/variationRadarChartParity.test.ts`, Test: full app suite + `tsc -b`) — blocked by Task 3

## Status

Tasks 1-3 DONE (implemented, tested, `tsc -b` clean, full app suite green, `npm run
build -w packages/app` clean). Task 4 (parity test coverage) is **BLOCKED** — see root
cause below. Do not resume Task 4 as originally scoped until the root cause is fixed.

## Task 4 blocker: real wiring gap found, not a test-harness bug (2026-07-09)

While adding parity test coverage for the new normalized snapshot path, the
`feature-implementer` agent found the normalized numbers diverge far more than the
precedented ~0.7%/0.4% (bench/deadlift) residual: **bench 23.7%, deadlift 21.7%**, both
concentrated entirely on **addlWt (equipment: bands/chains/slingshot) variations**
(e.g. "Bench (Slingshot, chain)" +23.7%, "Bench (bands)" +17.3%, "Deadlift (bands)"
+21.7%). Squat (no addlWt variations in the fixture) is 0.0%, consistent with an
addlWt-specific root cause rather than a general normalization bug.

### Root cause

`conjugateChartSpecs.ts`'s `variations` dataset spec is `{ kind: 'series', groupBy:
'label', derive: 'e1rm-max-effort' }`. In `packages/pipeline/src/pipeline.ts`'s
`buildDatasetsFromModel`, `kind: 'series' && groupBy: 'label'` specs are sourced from
`pointsByLabelByDeriver` (built via plain `buildPointsByLabel(tagged, id)` — **raw,
un-offset-adjusted** tagged records).

By contrast, `kind: 'composite'` specs (e.g. `ConjugateCharts`' own `normalized`
dataset) are sourced from `pointsByDeriverAdjusted`, which DOES apply
`offsetAdjustRecords(tagged, model)` first — i.e. it corrects each addlWt canonical's
raw `weight` field by its fitted `offsetKg` _before_ deriving e1RM, per the
"Design C" comment in `derive/normalize.ts` (`offsetAdjustRecords` applies the
weight-space offset pre-derivation; this is NOT equivalent to `normalizeE1rm`'s
post-hoc factor division — the two corrections are different and addlWt canonicals need
BOTH: weight-offset pre-derivation, then variantFactor division via `normalizeE1rm`).

Task 2's `snapshotNormalizedVariationsFromPipeline` (and Task 3's wiring) built the
normalized snapshot from `datasets.variations` (the un-adjusted, by-label series) and
applied only `normalizeE1rm` (the variantFactor division) — silently skipping the
weight-space offset step that addlWt canonicals require. That's why only addlWt
(equipment) variations show large divergence: their e1RM was computed from
uncorrected raw weight, then divided by a variantFactor that was itself fit against
_offset-corrected_ records (see `fitNormalizationModel`'s `recordsToFit` step in
`derive/normalize.ts`) — a mismatch between fit-time and apply-time inputs.

### Fix options for a follow-up session (NOT decided here — flag, don't invent, per

`packages/pipeline/src/derive/CLAUDE.md`'s convention)

1. **(Likely minimal-diff)** Add an offset-adjusted counterpart to
   `pointsByLabelByDeriver` in `pipeline.ts` (mirroring `pointsByDeriverAdjusted`'s
   existing pattern for the canonical-grouped case), and have
   `buildDatasetsFromModel` source `kind: 'series' && groupBy: 'label'` specs that opt
   into normalization from that adjusted map instead of the raw one. This is a
   `@dyel/pipeline` package change, not just an app-layer wiring change — bigger than
   Tasks 1-3's original scope.
2. Alternatively, keep `datasets.variations` raw (used by both the existing raw
   snapshot AND other consumers — check for other callers of
   `pointsByLabelByDeriver`/`conjugateChartSpecs('variations')` before touching its
   shape) and instead have the app-layer normalization step re-derive each addlWt
   label's e1RM from offset-adjusted raw weight itself — likely requires exposing
   per-set weight/reps (not just a collapsed e1RM point) for by-label groups, a bigger
   app-layer lift and probably worse (duplicates pipeline-side derivation logic in the
   app, against the migration boundary rule).

Option 1 is the more architecturally consistent fix (mirrors existing
`pointsByDeriverAdjusted` precedent exactly) but touches `@dyel/pipeline` package code,
which needs its own scoping/review pass, not a blind continuation of Tasks 1-4's
app-only plan.

### Resolution (2026-07-09): Tasks 5, 6, 4 all landed — effort COMPLETE

- [x] **Task 5**: `packages/pipeline/src/pipeline.ts` now has `pointsByLabelByDeriverAdjusted`
      (offset-adjusted-by-label points, mirroring `pointsByDeriverAdjusted`'s pattern but via
      a direct `buildPointsByLabel(offsetAdjustRecords(tagged, model), id)` recompute rather
      than the canonical-keyed filter/merge trick, which doesn't translate to label-keyed
      points). `SeriesSpec` gained an opt-in `normalize?: true` field (only meaningful with
      `groupBy: 'label'`) routing to the new map. Additive only — the existing `variations`
      spec (raw, `ConjugateCharts`' per-variation lines) is untouched. New pipeline test
      coverage added (`pipeline.test.ts`); `dataset/CLAUDE.md` updated. `npm test -w
    packages/pipeline`: 176/176 green. `npm run build -w packages/pipeline`: clean.
- [x] **Task 6**: `packages/app/src/pipeline/conjugateChartSpecs.ts` gained a third spec,
      `variationsAdjusted` (same as `variations` but `normalize: true`).
      `usePipelineVariationRadarData.ts`'s normalized-snapshot call now sources from
      `datasets.variationsAdjusted` instead of `datasets.variations`; the raw `snapshot`
      still sources from `datasets.variations`, unchanged.
- [x] **Task 4**: `variationRadarChartParity.test.ts` updated (as part of Task 6's
      sanity-check, verified independently after) — diffs `legacySnapshots` against a new
      `pipelineNormalizedSnapshots` (built via `variationsAdjusted`), soft-warn tier
      (`console.warn`, no hard assert), stale "no longer consumes in production" comment
      corrected. Verified divergence: **squat 0.0%, bench 0.7%, deadlift 0.0%** — matches/
      beats the precedented `TotalChart`/`ConjugateCharts` ~0.7%/0.4% baseline (the single
      remaining bench 0.7% is the same known rounding-boundary unit-conversion artifact
      documented in this file's raw-snapshot test comment, not the addlWtOffset bug).

### Final verification (independently re-run, not just agent-reported)

- `npx vitest run` (packages/app): **275/275 passing**
- `npx tsc -b` (packages/app): clean
- `npm test -w packages/pipeline`: **176/176 passing**
- `npm run build -w packages/pipeline` and `npm run build -w packages/app`: clean

### Net result

`VariationRadarChart` now shows both raw and cross-exercise-normalized (baseline-only)
e1RM per variation — teal overlay series + "Normalized e1RM: ..." tooltip line, alongside
the existing raw cyan series and pink target-value ring — with the normalized values
verified correct (including for equipment/addlWt variations) against legacy, at the same
already-accepted residual level as every other pipeline-normalized chart in the app.

**Effort status: DONE.** All 6 tasks complete.

### Same-day follow-up: raw e1RM display removed (2026-07-09)

Per explicit direction, simplified `VariationRadarChart` from dual-series (raw + normalized)
to normalized-only: radar spokes and the target ring now both source from
`normalizedSnapshot`; `BaseRadarChart`'s `secondarySeries` prop (added to support the
dual-series version) was removed as dead code (single caller, no longer needed). Section
label reverted to `"Normalized e1RM by variation"`. `usePipelineVariationRadarData`'s raw
`snapshot` field is retained on the hook (used by the parity test's cross-check and
available to future consumers) but no longer read by the chart component itself.
Re-verified: `npx vitest run` 275/275, `npx tsc -b` clean, `npm run build -w packages/app`
clean. See `migration/VariationRadarChart.md`'s "Raw display removed" section for full
detail. Documented and committed together with the rest of this effort.
