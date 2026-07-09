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

## Blocker (2) closed; blocker (1) narrowed but still open (2026-07-08)

**Blocker (2), tooltip data gap, is resolved.** `packages/app/src/pipeline/lastSessionDetail.ts`
(new, committed) builds a pipeline-native `Map<string, { date, sets, reps, weight, rpe }>`
per variation label from `TaggedSetRecord[]`, mirroring `SessionStats.lastSession`'s
shape. Wiring it into `variationRadarChartParity.test.ts` surfaced two real, now-fixed
issues rather than a clean first pass:

- **Unit-conversion bug**: the builder initially returned `weight` in pipeline-native kg
  with no conversion to the athlete's display unit (legacy returns lbs on this fixture) —
  fixed to convert before returning/comparing.
- **Test-harness scope mismatch**: the parity comparison was diffing pipeline's
  lift-scoped last-session map against legacy's _global_ (all-exercises) map, producing
  noisy false-"missing" warnings for unrelated lifts' exercises — fixed to scope both
  sides to the same lift type before diffing.

**Blocker (1) is substantially narrowed, not closed.** `ConjugateCharts.md`'s Finding #6
fix (Design B addlWtOffset wiring) brought the shared normalization divergence down to
squat 0.0% / bench 7.0% / deadlift 0.4% — a big improvement from the original 9.8%/5.1%,
but still soft-warned, not hard-asserted, per `APP_COMPONENTS.md`'s exact-match gate. Do
not treat blocker (1) as resolved until that gate is met.

## Wire-verify-revert dry run (2026-07-08)

Per explicit direction, this session also promoted `testUtils/diffVariationSnapshot.ts`'s
`snapshotVariationsFromPipeline` reduction logic to a standalone runtime util
(`packages/app/src/utils/variationSnapshot.ts`, new, committed, unit-tested), then fully
wired `VariationRadarChart.tsx`/`LiftTabPanel.tsx` onto pipeline-derived props (the
promoted snapshot util + `lastSessionDetail.ts`'s last-session map) as a live end-to-end
verification exercise, not a committed swap. Full suite (`npm test -w packages/app`,
205/205) and both builds (`npm run build -w packages/pipeline && npm run build -w
packages/app`) passed with the swap live. Observed divergence matched
`ConjugateCharts.md`'s already-documented numbers (squat Box Squat 13.9%, bench American
Bar variants up to 26.1%, deadlift 2" deficit 5.6% — same underlying normalization-fitting
approximation, not a new gap).

**Both `VariationRadarChart.tsx` and `LiftTabPanel.tsx` were reverted to their
pre-dry-run `@dyel/core`-calling state immediately after verification** (confirmed via
`git status --porcelain` showing no diff) — this was a verification-only pass. The actual
swap-over remains not-done, gated on blocker (1) above closing to an exact match per
`APP_COMPONENTS.md`'s policy.

## Root-caused stale divergence numbers (2026-07-09, precedes swap-over below)

A dedicated root-cause session found the alarming divergence numbers quoted above (squat
13.9%, bench 23.2%/26.1%, deadlift 5.6%) were **test-harness bugs, not real pipeline
regressions** — the same class of bug `conjugateChartParity.test.ts` had (stale
`buildSessionStats` input). Two real bugs were found and fixed, both confined to test files
(`testUtils/diffVariationSnapshot.ts` and this file):

1. `variationRadarChartParity.test.ts` called `snapshotVariationsFromPipeline` wrapped in
   `mergeWideRechartsRows(...)`, but `snapshotVariationsFromPipeline` expects the **raw**
   `RechartsRow[]` (kg-valued, `.t`-keyed) — it does its own most-recent-row selection and
   its own kg→lbs conversion. The wrapper had already converted `.t`→`.date` and kg→lbs, so
   the internal `.t` comparison always failed (silently falling back to the first row, not
   the true most-recent one) and `conv()` double-applied the kg→lbs conversion (~2.2x
   inflation). Fixed by passing `res.datasets.variations` directly.
2. `snapshotVariationsFromLegacy` (`testUtils/diffVariationSnapshot.ts`) multiplied
   `normalizeToBaseE1RM`'s output by a kg→lbs `conv()` factor, but `@dyel/core`'s
   `TrainingSession.weight` is never unit-converted internally (stays in the source sheet's
   declared unit) — so already-lbs values were inflated another ~2.2x. Fixed by removing the
   conversion entirely, mirroring `buildVariationChartData`'s own (correct) precedent.

After both fixes, a new apples-to-apples **raw** (un-normalized) comparison was added
(`legacyRawSnapshots` vs. `pipelineSnapshots`, both un-normalized) to isolate a real,
pre-existing semantic mismatch (the old test compared legacy's cross-exercise-_normalized_
value against pipeline's _raw_ value — not apples-to-apples) from actual bugs. Trustworthy
residual after fixes: **raw** squat/bench/deadlift 0.0%/0.0%/0.0%; **normalized**
(cross-exercise, via `normalizeToBaseE1RM` vs. pipeline's fixed-baseline `normalize: true`)
squat 0.0%, deadlift 1.9%, bench 21.5% — the normalized residual is the same missing-primitive
class of gap as `ConjugateCharts`' deprecated dropdown (pipeline has no per-variation
cross-exercise-normalization equivalent), not a bug.

## VariationRadarChart swap-over (2026-07-09, closes #460)

**Decision made**: given (a) the raw per-variation e1RM snapshot has genuine, trustworthy
0.0% divergence from legacy (not a soft-warn-tolerance judgment call — a real exact match),
and (b) the remaining bench 21.5% gap is confirmed to be the same missing-primitive class of
divergence `ConjugateCharts` already resolved by deprecating its per-target dropdown, the
same precedent was applied here: `VariationRadarChart`'s cross-exercise per-target
normalization (`normalizeToBaseE1RM`) is **deprecated, not ported**. The radar now displays
each variation's raw, un-normalized last-session e1RM.

Unlike `ConjugateCharts`' swap (which accepted a nonzero soft-warn residual as an explicit
maintainer exception to the migration gate), this swap's production data path is fully
gate-compliant: the raw-snapshot parity test was **promoted from soft-warn to a hard
assertion** (`expect(maxRelDiff).toBe(0)`) in `variationRadarChartParity.test.ts`, since
that's what actually ships now. The normalized-snapshot test remains soft-warn-only,
untouched, retained purely as a historical/tracked measurement (no longer relevant to
production since that code path was dropped).

### Implementation

- New `packages/app/src/hooks/pipeline/usePipelineVariationRadarData.ts`: pipeline-native
  data hook, sourced from the shared `PipelineModel` via `usePipelineModel()` +
  `usePipelineDatasets(conjugateChartSpecs(liftType), {})` (never calls `runPipeline`
  directly, per the migration boundary rule). Returns `{ snapshot, lastSessionByLabel }` —
  the raw per-variation e1RM map (`utils/variationSnapshot.ts`'s
  `snapshotVariationsFromPipeline`) and last-session tooltip detail
  (`pipeline/lastSessionDetail.ts`'s `buildLastSessionDetail`). Unit-tested
  (`usePipelineVariationRadarData.test.ts`).
- `components/charts/VariationRadarChart.tsx`: no longer imports `@dyel/core`
  (`ConjugateExercise`, `normalizeToBaseE1RM`) or takes `rows`/`stats`/`baselineName` props.
  New prop shape: `{ liftType, unit, targetName, onVariationClick? }`. Radar spoke/ring
  values and tooltip now read from the new hook; the tooltip's date/weight fields convert
  `LastSessionDetail`'s ISO date string / kg weight to the display unit inline (same
  `KG_TO_LBS` pattern used elsewhere in this migration).
- `components/pages/LiftTabPanel.tsx`: call site updated to the new prop shape; its own
  now-fully-unused `rows`/`effectiveBaselineNames`/`baselineName` props, `filteredRows`
  `useMemo`, and `useLastSessionStats` call were removed as dead code, cascading a small prop
  signature change to `LiftTabPanel`'s single caller (`App.tsx`).

### Verification

`npm run build -w packages/pipeline && npm run build -w packages/core && npm run build -w
packages/app && npm test -w packages/pipeline && npm test -w packages/core && npm test -w
packages/app` — all green (pipeline 12/144, core 22/321, app 26/254), no regressions.
`grep -rn "@dyel/core" components/charts/VariationRadarChart.tsx
components/pages/LiftTabPanel.tsx` returns only `LiftTabPanel.tsx`'s two remaining type-only
imports (`DeadliftStancePreference`, `LiftType`), not runtime business logic.

`LiftTabPanel.md` (`MIGRATION_PLAN.md` item #2, composition-root migration) is now unblocked.
