# Migrate VariationRadarChart to @dyel/pipeline and add a parity test

Following the pattern established in `packages/app/src/pipeline/totalChartParity.test.ts`
and `migration/ConjugateCharts.md`, validate a pipeline-native replacement for
`VariationRadarChart` and add an analogous parity test. **The component swap-over itself is
intentionally deferred — see "Status" below before doing any further work here.**

## Context

`VariationRadarChart.tsx` currently calls `normalizeToBaseE1RM` and depends on the
`ConjugateExercise` type (both `@dyel/core`) to build a last-session-only radar snapshot
per variation. This is the exact legacy analogue that `migration/ConjugateCharts.md`'s
snapshot tier already diffs against pipeline's per-variation series — meaning the hard
part (reducing pipeline's `Point[]` series to a last-value-per-variation snapshot) was
already solved by that work (`testUtils/diffVariationSnapshot.ts`) and has been reused here,
not reinvented.

## Plan

1. ~~Land `migration/ConjugateCharts.md` first~~ — done; its snapshot-diff logic
   (`testUtils/diffVariationSnapshot.ts`'s `snapshotVariationsFromLegacy`/
   `snapshotVariationsFromPipeline`/`diffVariationSnapshots`) already existed and is the
   direct dependency this migration reused.
2. ~~Migrate `VariationRadarChart.tsx` itself~~ — **deferred, not done.** See "Status" below
   for why. Do not swap `VariationRadarChart.tsx` over to consume pipeline's per-variation
   snapshot until both blockers there are resolved.
3. Added `packages/app/src/pipeline/variationRadarChartParity.test.ts`: reuses
   `snapshotVariationsFromLegacy`/`snapshotVariationsFromPipeline`/`diffVariationSnapshots`
   to diff legacy's `normalizeToBaseE1RM` snapshot against `conjugateChartSpecs(liftType)` +
   `runPipeline`'s pipeline-derived snapshot, `it.each` per lift type (squat/bench/deadlift),
   soft-warning on any divergence rather than hard-asserting equality (per the intentional-
   exception pattern documented in `packages/app/CLAUDE.md` and the precedent set by
   `conjugateChartParity.test.ts`).
4. Reused `test/fixtures/total-chart-sheet.csv` — on this fixture, no divergence was
   observed in either direction for squat/bench/deadlift, but the harness deliberately
   doesn't hard-assert on that (see "Status").

## Verification

`npm test -w packages/app -- variationRadarChartParity`

## Status

**Pipeline-native replacement validated; component swap intentionally deferred**, for two
independent reasons — either one alone would be enough to hold off:

1. **Shared divergence risk with `ConjugateCharts`.** `VariationRadarChart`'s
   `normalizeToBaseE1RM`-based normalization is the same category of per-variation
   normalization that `ConjugateCharts` was migrated to `@dyel/pipeline` and then
   **deliberately reverted** away from (`46f267f`, see `HANDOFF.md`, Session 6) after its
   own parity test surfaced real divergence from legacy. `variationRadarChartParity.test.ts`
   not showing divergence on the current fixture is not the same as the underlying
   normalization-fitting logic being reconciled — it may simply mean this fixture doesn't
   exercise the divergent path. Swapping `VariationRadarChart.tsx` over before that
   divergence is root-caused (documented as an open item in `ConjugateCharts.md` and
   `APP_COMPONENTS.md`) risks silently reintroducing the same bug into a second
   user-facing chart.
2. **Tooltip data gap.** The pipeline snapshot (`snapshotVariationsFromPipeline`) only
   carries a last-value e1RM number per variation. `VariationRadarChart.tsx`'s tooltip
   additionally renders last-session detail — date, sets, reps, weight, RPE — sourced from
   `SessionStats.lastSession`, which has no pipeline-native equivalent yet. A swap isn't a
   simple hook-for-function-call substitution (unlike `DiagnosticsPanel`/`RepCalculator`/
   `StrengthScoreCalculator`) until this data is available from the pipeline side too.

Before re-attempting the swap: resolve (1) — the shared `ConjugateCharts`/
`VariationRadarChart` normalization divergence — and (2) — source last-session tooltip
detail from the pipeline. Track both as prerequisites, not as part of "swap the hook and
go."
