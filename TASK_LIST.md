# TASK_LIST — Swap remaining chart components onto `@dyel/pipeline`'s `ChartPoint`

## Context

Scoping pass (2026-07-08) confirmed most of `packages/app/src/components/charts/` is
already migrated: `TotalChart`, `DateLineChart`, `SessionBarChart` all consume
`ChartPoint[]` from `@dyel/pipeline` directly; `SigmaChart`/`BaseRadarChart` are
either already pipeline-fed or fully generic. **The one real holdout is
`VariationRadarChart.tsx`**, which still calls `normalizeToBaseE1RM`/`ConjugateExercise`
straight from `@dyel/core`.

Per `MIGRATION_PLAN.md`, `VariationRadarChart` (issue
[#460](https://github.com/kasittig/dyel-visualizer/issues/460)) is hard-blocked on
`ConjugateCharts` (issue [#459](https://github.com/kasittig/dyel-visualizer/issues/459))
landing first, plus one extra prerequisite: the pipeline snapshot
(`snapshotVariationsFromPipeline`) only carries a last-value e1RM number — no
last-session tooltip detail (date/sets/reps/weight/RPE). Good news from this session's
investigation: all of those fields already exist on the pipeline's raw `SetRecord`/
`TaggedSetRecord` (`meta.sets`, `reps`, `weight`, `rpe`, `date`) — this is a wiring gap,
not a missing-capability gap.

Per `migration/ConjugateCharts.md`, the normalization divergence that previously blocked
the `ConjugateCharts` swap (Findings #1, #3, #5, #6) is now fixed or downgraded; only
Finding #6's residual (expected ceiling of Design B's e1RM-space approximation, not a bug)
remains, and per-variation soft-warns stay soft (n=1-2 sample sizes, not enough to
hard-assert) — this does **not** block the swap itself.

Do not touch `DiagnosticsPanel` (#461) or `LiftTabPanel` composition-root wiring beyond
Task 6 below — those are separate `MIGRATION_PLAN.md` items, out of scope for this pass.

## Task list

### Phase A — Swap `ConjugateCharts` onto `@dyel/pipeline` (unblocks Phase C)

- [ ] Task 1: Swap `useConjugateChartData.ts` to call `runPipeline` +
      `conjugateChartSpecs(liftType)` (already validated in
      `packages/app/src/pipeline/conjugateChartSpecs.ts`) instead of `@dyel/core`'s
      `buildVariationChartData`; remove the direct `LINE_COLORS`/`RepCalcStats`
      `@dyel/core` imports from `ConjugateCharts.tsx`. (Target:
      `packages/app/src/hooks/conjugate/useConjugateChartData.ts`,
      `packages/app/src/components/conjugate/ConjugateCharts.tsx`. Test: `npm test -w
    packages/app -- conjugateChartParity`)
- [ ] Task 2: QA full regression + manual smoke check (dev server, all three lift tabs'
      variation chart) before calling Phase A done. (Target: n/a. Test: `npm run build -w
    packages/app && npm test -w packages/app`)

### Phase B — Source last-session tooltip detail from the pipeline (2nd prerequisite for Phase C)

- [ ] Task 3: Add a pipeline-native "last session detail" builder producing, per
      variation label, `{ date, sets, reps, weight, rpe }` — mirroring
      `SessionStats.lastSession` — sourced from `SetRecord.meta.sets`/`reps`/`weight`/
      `rpe`/`date` on the tagged records `conjugateChartSpecs` already consumes. (Target:
      new file, e.g. `packages/app/src/pipeline/lastSessionDetail.ts`. Test: new colocated
      unit test, e.g. `lastSessionDetail.test.ts`)
- [ ] Task 4: Wire Task 3's builder into `variationRadarChartParity.test.ts` and confirm
      no divergence against legacy `SessionStats.lastSession` on the real fixture
      (soft-warn tier, same pattern as the rest of this harness). (Target:
      `packages/app/src/pipeline/variationRadarChartParity.test.ts`. Test: `npm test -w
    packages/app -- variationRadarChartParity`)

### Phase C — Swap `VariationRadarChart.tsx` itself (#460)

- [ ] Task 5: Swap `VariationRadarChart.tsx`'s props from `rows: ConjugateDataPair[]` /
      `stats: SessionStats` to pipeline-derived data — the `RechartsRow[]`/`ChartPoint[]`
      snapshot from `conjugateChartSpecs` (reducing via the same logic as
      `snapshotVariationsFromPipeline`, promoted from `testUtils/` to a runtime util) plus
      Task 3's last-session-detail map. Remove the `normalizeToBaseE1RM`/`@dyel/core`
      call entirely. (Target: `packages/app/src/components/charts/VariationRadarChart.tsx`.
      Test: `npm test -w packages/app -- variationRadarChartParity && npm run build -w
    packages/app`)
- [ ] Task 6: Update the caller, `LiftTabPanel.tsx`, to pass the new pipeline-derived
      props instead of `rows`/`stats`. (Target:
      `packages/app/src/components/pages/LiftTabPanel.tsx`. Test: `npm test -w
    packages/app`)
- [ ] Task 7: Full regression QA — both builds, both test suites, plus a manual dev-server
      smoke test of the variation radar + its tooltip content (date/sets/reps/weight/RPE
      still rendering correctly) across all three lift tabs. (Target: n/a. Test: `npm run
    build -w packages/pipeline && npm run build -w packages/app && npm test -w
    packages/pipeline && npm test -w packages/app`)

### Phase D — Docs cleanup

- [ ] Task 8: Update `MIGRATION_PLAN.md`, `migration/ConjugateCharts.md`,
      `migration/VariationRadarChart.md`, and `APP_COMPONENTS.md` to mark both components
      swapped; update `HANDOFF.md`. Do not close GitHub issues #459/#460 directly — they
      close automatically when the PR(s) referencing "closes #459"/"closes #460" merge.
      (Target: `MIGRATION_PLAN.md`, `migration/ConjugateCharts.md`,
      `migration/VariationRadarChart.md`, `APP_COMPONENTS.md`, `HANDOFF.md`. Test: n/a,
      docs only)

### Optional / low priority (not blocking)

- [ ] Task 9: Tighten `BaseRadarChart`'s `data: object[]` prop to `ChartPoint[]` now that
      both its callers (`SigmaChart`, and post-Phase-C `VariationRadarChart`) are
      pipeline-fed. Cosmetic type-safety improvement only. (Target:
      `packages/app/src/components/charts/BaseRadarChart.tsx`. Test: `npm run build -w
    packages/app`)

## Sequencing

Phase A must land before Phase C (hard dependency, per `MIGRATION_PLAN.md`). Phase B has
no dependency on Phase A and can run in parallel with it. Phase C depends on both A and B.
Phase D is last. Task 9 can happen any time after Phase C.
