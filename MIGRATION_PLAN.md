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

**Phase 1 complete.** All five items landed on branch `migration-phase-1`, each with a
parity test and verified via `feature-implementer` + independent `qa-reviewer` passes:

1. `TotalChart.md` — `ChartPoint` relocated to `@dyel/pipeline`; zero `@dyel/core` refs.
2. `ConjugateCharts.md` — `LINE_COLORS` relocated to `@dyel/pipeline`;
   `conjugateChartParity.test.ts` added.
3. `DiagnosticsPanel.md` — migrated to `PipelineResult.diagnostics` via new
   `usePipelineDiagnostics` hook; `diagnosticsPanelParity.test.ts` added.
4. `RepCalculator.md` — migrated to `findBestE1RMFromPipeline` via new
   `usePipelineRepCalculator` hook; `repCalculatorParity.test.ts` added. Took three passes
   (first left runtime `@dyel/core` imports in place; second relocated the dependency into
   a new app-level util that still called `@dyel/core`'s `buildSessionStats` rather than
   eliminating it, and hit a broken build in a stale worktree; third pass correctly wired
   the existing pipeline-native `findBestE1RMFromPipeline` into the component and deleted
   the core-backed wrapper file).
5. `StrengthScoreCalculator.md` — new `computeStrengthScores` added to `@dyel/pipeline`
   (Wilks/DOTS/Schwartz-Malone/percentile-rank); `strengthScoreCalculatorParity.test.ts`
   added.

Full verification: `npm run build -w packages/pipeline && npm run build -w packages/app`
clean; `npm test -w packages/app` — 14 test files, 169 tests, all passing.

See `APP_COMPONENTS.md` for the updated "Already migrated" inventory.

Next: Phase 2 (`SigmaTab.md`, `VariationRadarChart.md`).
