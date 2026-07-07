# Migration Plan — execution order for `migration/*.md`

Ordering for the per-component migration/parity-test docs in `migration/`, derived from
the actual dependencies called out in each doc (not file-list order). See
`APP_COMPONENTS.md` for the full component inventory these docs cover.

## Phase 0 — external prerequisite (tracked separately)

- `SPECIFICATIONS.md` Part A (`deadliftStance` on `AthleteContext`) — not itself a file in
  `migration/`, but it's a hard blocker for `migration/LiftTabPanel.md` (Phase 4 below), so
  it should land before that regardless of what else is in flight.

## Phase 1 — quick wins / no cross-doc dependencies (parallelizable)

1. **`migration/TotalChart.md`** — trivial (just the `ChartPoint` re-export from
   `@dyel/pipeline`), and it's the shared prerequisite for `SessionBarChart`/
   `DateLineChart`/`SigmaChart`'s cleanup later. Do this first so nobody duplicates the
   re-export work.
2. **`migration/ConjugateCharts.md`** — already-drafted parity test, blocks both
   `VariationRadarChart` and `LiftTabPanel`. High leverage, do early.
3. **`migration/DiagnosticsPanel.md`** — independent, and the pipeline side (`diagnose()`)
   already exists, so this is nearly a pure wiring task. Also a hard dependency of
   `LiftTabPanel`.
4. **`migration/RepCalculator.md`** — independent; only the "best e1RM" selection logic
   is missing, small lift.
5. **`migration/StrengthScoreCalculator.md`** — independent, but requires a genuinely new
   pipeline function (Wilks/DOTS/percentile), so it's the heaviest of this batch. Fine to
   run in parallel with 1–4, just don't expect it to finish as fast.

## Phase 2 — builds directly on Phase 1

6. **`migration/SigmaTab.md`** — reuses `TotalChart`'s already-existing
   `totalChartSpecs.ts`/parity harness almost directly, so it's cheap once #1 is settled.
7. **`migration/VariationRadarChart.md`** — explicitly depends on #2's snapshot-diff logic
   (`diffVariationSnapshot`).

## Phase 3 — depends on Phase 2's fixtures

8. **`migration/SessionBarChart.md`** and 9. **`migration/SigmaChart.md`** — both reuse
   `SigmaTab`'s pipeline-sourced fixtures for their parity tests and share the
   `ChartPoint`/`formatDate` cleanup from #1. Do these together since it's the same
   underlying change applied twice.
9. **`migration/DateLineChart.md`** — its parity test checks consumers (`TotalChart` +
   `SigmaTab`'s Σ line), so it wants both #1 and #6 already landed.

## Phase 4 — composition root, last

11. **`migration/LiftTabPanel.md`** — explicitly blocked on #2, #7, #3, _and_ the Phase 0
    `deadliftStance` work. This has the most dependencies of anything in the set, so it's
    naturally last.

## Off to the side, any time

- **`migration/ValidatorPage.md`** — has no technical dependency on the others; it's
  blocked on a scope decision ("is this even in scope for migration?"), not on
  sequencing. Raise that question early (in parallel with Phase 1) so the answer is
  available by the time anyone's looking for more work, but the actual test-writing can
  happen whenever.

## Parallelization note

If splitting across people/agents rather than running serially: Phase 1's five items are
the best set to hand out concurrently, then Phase 2/3 fall out naturally, with
`LiftTabPanel` held back until last.

## Status

**Phase 1: pipeline-side work + parity tests complete; component swap-over deliberately
deferred for 3 of 5 items.** All five items landed on branch `migration-phase-1`, each with
a parity test verified via `feature-implementer` + independent `qa-reviewer` passes. Two are
fully migrated (component wired to pipeline); three have a validated pipeline-native
replacement and passing parity test, but the component itself still calls `@dyel/core` at
runtime, by design — swapping it in is left as a small, trivial follow-up:

1. `TotalChart.md` — **fully migrated.** `ChartPoint` relocated to `@dyel/pipeline`; zero
   `@dyel/core` refs.
2. `ConjugateCharts.md` — **migrated then deliberately reverted.** `LINE_COLORS` relocated to
   `@dyel/pipeline` and `conjugateChartParity.test.ts` added, but the component was reverted back
   to `@dyel/core` (`46f267f`) after the parity test surfaced real normalization divergence.
   Not currently migrated; re-attempting requires resolving that divergence first (see
   `migration/ConjugateCharts.md`'s "Scoping session" section for the root-cause analysis).
3. `DiagnosticsPanel.md` — **pipeline-native replacement ready, component not yet swapped.**
   New `usePipelineDiagnostics` hook wraps `PipelineResult.diagnostics`;
   `diagnosticsPanelParity.test.ts` passing. `DiagnosticsPanel.tsx` still calls
   `generateDiagnostics` (`@dyel/core`).
4. `RepCalculator.md` — **pipeline-native replacement ready, component not yet swapped.** New
   `usePipelineRepCalculator` hook + `findBestE1RMFromPipeline` mirror legacy `findBestE1RM`'s
   logic over pipeline `Point[]`/`NormalizationModel` data; `repCalculatorParity.test.ts`
   passing. `RepCalculator.tsx` still calls `findBestE1RM`/`buildSessionStats` (`@dyel/core`).
   (Getting the pipeline-native helper itself correct took three passes — see git history —
   but the helper is now validated by the parity test independent of the component.)
5. `StrengthScoreCalculator.md` — **pipeline-native replacement ready, component not yet
   swapped.** New `computeStrengthScores` added to `@dyel/pipeline` (Wilks/DOTS/
   Schwartz-Malone/percentile-rank); `strengthScoreCalculatorParity.test.ts` passing.
   `StrengthScoreCalculator.tsx` still calls `calculateMetrics` (`@dyel/core`) — swapping
   this one is a one-line change (same signature).

Full verification: `npm run build -w packages/pipeline && npm run build -w packages/app`
clean; `npm test -w packages/app` — 14 test files, 169 tests, all passing.

See `APP_COMPONENTS.md` for the updated inventory ("Already migrated" vs. "Ready to
migrate").

Next: swap over the 3 "ready to migrate" components whenever desired (each is now a small,
low-risk change backed by a passing parity test), then Phase 2 (`SigmaTab.md`,
`VariationRadarChart.md`).

## Phase 2 status

**Complete.** Both Phase 2 items landed on `migration-phase-1`:

6. `SigmaTab.md` — **fully migrated.** `SigmaTab.tsx` now sources its squat/bench/deadlift/
   pushPull/total data from `usePipelineTotalChartData` (`runPipeline` + `TOTAL_CHART_SPECS`,
   previously dead code — nothing called it) instead of `@dyel/core`'s `buildChartData`, merging
   in the `volume`/accessory-volume series via a new `mergeVolumeIntoChartPoints` helper
   (`utils/pipelineChartUtils.ts`) against the `volumeByDate` prop, which was already computed
   independently in `App.tsx` (via `calculateVolumeCorrelation`) and needed no pipeline-side
   change. `SigmaTab.tsx` has zero `@dyel/core` imports. `sigmaTabParity.test.ts` added
   (17 tests): hard-asserts squat/deadlift/pushPull/total and the `volume` series (exact match,
   since both sides source it from the same `calculateVolumeCorrelation` call), soft-warns bench
   per the same documented normalization divergence as `totalChartParity.test.ts`.
7. `VariationRadarChart.md` — **pipeline-native replacement validated, component swap
   intentionally deferred.** `variationRadarChartParity.test.ts` added (5 tests), reusing
   `conjugateChartSpecs()` + `testUtils/diffVariationSnapshot.ts`'s
   `snapshotVariationsFromLegacy`/`snapshotVariationsFromPipeline`/`diffVariationSnapshots` over
   the real fixture — no divergence surfaced on the current fixture, but the harness soft-warns
   (doesn't hard-assert equality) since the underlying per-variation normalization is the same
   logic `ConjugateCharts` was reverted away from after a prior parity test found real divergence
   (`46f267f`; see `HANDOFF.md`). `VariationRadarChart.tsx` itself is **not** swapped over yet —
   deferred for two reasons: (1) avoid reintroducing the same divergence risk into a second
   user-facing chart before that divergence is root-caused/reconciled, and (2) the pipeline
   snapshot only carries e1RM values, not the last-session detail (date, sets, reps, weight, RPE)
   the component's tooltip currently shows, which would need to be sourced separately before a
   swap is even feature-complete. See `migration/VariationRadarChart.md` for the updated plan.

Full verification: `npm run build -w packages/pipeline && npm run build -w packages/core &&
npm run build -w packages/app` clean; `npm test -w packages/app` — 16 test files, 181 tests, all
passing (up from 14 files/159 tests before Phase 2).

See `APP_COMPONENTS.md` for the updated inventory. Next: Phase 3 (`SessionBarChart.md`,
`SigmaChart.md`, `DateLineChart.md`) once someone picks it up, or resolve the `ConjugateCharts`/
`VariationRadarChart` normalization divergence to unblock those two swap-overs.

## Phase 3 status

**Complete.** All three items landed on `migration-phase-1`:

8. `SessionBarChart.md` — **fully migrated.** `formatDate` relocated to a new
   `formatChartDate` helper in `packages/app/src/utils/pipelineChartUtils.ts` (exact same
   tick-formatting behavior as `@dyel/core`'s version); `ChartPoint` now imported from
   `@dyel/pipeline`. Zero `@dyel/core` references remain in `SessionBarChart.tsx`.
   `pipeline/sessionBarChartParity.test.ts` added — lightweight sanity/regression check (no
   legacy diff, since the component has no aggregation logic of its own) over squat/bench/
   deadlift/volume series sourced from the same pipeline fixture `sigmaTabParity.test.ts` uses.
9. `SigmaChart.md` — **fully migrated.** Its only `@dyel/core` dependency (the `ChartPoint`
   type) now imports from `@dyel/pipeline`. `pipeline/sigmaChartParity.test.ts` added — thin
   consumer check replicating the component's own last-value squat/bench/deadlift extraction
   logic over the pipeline-derived fixture.
10. `DateLineChart.md` — **fully migrated.** Same `formatChartDate`/`ChartPoint` treatment as
    `SessionBarChart`. `pipeline/dateLineChartParity.test.ts` added — smoke/regression check
    over all five series consumed by its real callers (`TotalChart`'s squat/bench/deadlift/
    pushPull/total, `SigmaTab`'s Σ line), confirming the shell's data shape (chronological
    order, valid ISO dates, sane values) rather than re-diffing legacy vs. pipeline.

Full verification: `npm run build -w packages/pipeline`, `npm run build -w packages/core`,
`npm run build -w packages/app` all clean; `npm test -w packages/app` — 19 test files, 200
tests, all passing (up from 16 files/181 tests before Phase 3). No regressions.

See `APP_COMPONENTS.md` for the updated inventory. Next: Phase 4 (`LiftTabPanel.md`), which is
explicitly blocked on `ConjugateCharts` (#2), `VariationRadarChart` (#7), `DiagnosticsPanel` (#3),
and the Phase 0 `deadliftStance` work. The `deadliftStance` prerequisite is itself already complete
(see `SPECIFICATIONS.md`'s Part A/B section). `DiagnosticsPanel` was initially assumed to be the
cheap one (small hook swap, parity test already passing) but a follow-up scoping pass this session
found otherwise: `diagnose()` has no canonical→display-name resolution, no
modifier-percentage-baseline-range model, and a differently-classified status enum versus what
`DiagnosticsPanel.tsx`'s render logic actually needs — see `migration/DiagnosticsPanel.md`'s Status
section and `APP_COMPONENTS.md`'s updated entry. All three remaining blockers
(`ConjugateCharts`/`VariationRadarChart`/`DiagnosticsPanel`) now require real pipeline-side work
before their swaps can proceed, not just wiring.
