# TASK_LIST — Swap remaining chart components onto `@dyel/pipeline`'s `ChartPoint`

## Status: Tasks 1–8 done (2026-07-08); Task 9 (optional/low priority) still open

The wire-verify-revert dry run described below was executed for both `ConjugateCharts`
(Phase A) and `VariationRadarChart` (Phase C), the net-new infra from Phase B landed and
stays committed, and Phase D's docs cleanup was completed — see the "Wire-verify-revert dry
run (2026-07-08)" sections in `migration/ConjugateCharts.md` and
`migration/VariationRadarChart.md`, and the current state of `MIGRATION_PLAN.md`/
`APP_COMPONENTS.md`. Per the plan below, the four call-site files were reverted after
verification — this was **not** a committed component swap-over; both components still call
`@dyel/core` at runtime, gated on issues #459/#460 as before. Only Task 9 (cosmetic, not
blocking) remains undone.

## IMPORTANT — wire it all up, verify, then revert the live flip before committing

Per explicit direction (2026-07-08): **fully implement the swap** — actually wire
`ConjugateCharts.tsx`/`useConjugateChartData.ts` and `VariationRadarChart.tsx`/
`LiftTabPanel.tsx` onto `@dyel/pipeline`, run it through full regression + manual smoke
QA, and confirm parity holds. Once verified, **revert only the live-wiring diff** in
those four files back to their current `@dyel/core`-calling state before committing, so
committed user-facing behavior is unchanged from today. All net-new supporting
infrastructure — `conjugateChartSpecs.ts` (already exists), the new
`lastSessionDetail.ts` builder, the promoted runtime snapshot util, and all
parity/unit tests — stays in the commit and stays passing; only the four call-site
files get reverted to their pre-swap imports/logic. Confirm with the user before
reverting if the diff-to-revert is ambiguous. Tasks below are annotated
`[WIRE + VERIFY, THEN REVERT CALL SITE]` vs `[KEEP — net-new infra, do not revert]`.

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

### Phase A — Swap `ConjugateCharts` onto `@dyel/pipeline`, verify, then revert the flip

- [x] Task 1 [WIRE + VERIFY, THEN REVERT CALL SITE]: Swap `useConjugateChartData.ts` to
      call `runPipeline` + `conjugateChartSpecs(liftType)` (already validated in
      `packages/app/src/pipeline/conjugateChartSpecs.ts`) instead of `@dyel/core`'s
      `buildVariationChartData`; remove the direct `LINE_COLORS`/`RepCalcStats`
      `@dyel/core` imports from `ConjugateCharts.tsx`. Verify against
      `conjugateChartParity.test.ts` and a manual smoke check, then **revert
      `useConjugateChartData.ts` and `ConjugateCharts.tsx` back to their current
      `@dyel/core`-calling state** before committing — only the verification step is
      the point of this task, not a committed behavior change. (Target:
      `packages/app/src/hooks/conjugate/useConjugateChartData.ts`,
      `packages/app/src/components/conjugate/ConjugateCharts.tsx`. Test: `npm test -w
packages/app -- conjugateChartParity`)
- [x] Task 2 [WIRE + VERIFY, THEN REVERT CALL SITE]: While Task 1's swap is live, run full
      regression + manual smoke check (dev server, all three lift tabs' variation chart)
      to confirm parity before reverting Task 1's call-site changes. (Target: n/a. Test:
      `npm run build -w packages/app && npm test -w packages/app`)

### Phase B — Source last-session tooltip detail from the pipeline (2nd prerequisite for Phase C) [KEEP — net-new infra, do not revert]

- [x] Task 3: Add a pipeline-native "last session detail" builder producing, per
      variation label, `{ date, sets, reps, weight, rpe }` — mirroring
      `SessionStats.lastSession` — sourced from `SetRecord.meta.sets`/`reps`/`weight`/
      `rpe`/`date` on the tagged records `conjugateChartSpecs` already consumes. This is
      net-new infra with no existing call site to revert. (Target: new file, e.g.
      `packages/app/src/pipeline/lastSessionDetail.ts`. Test: new colocated unit test,
      e.g. `lastSessionDetail.test.ts`)
- [x] Task 4: Wire Task 3's builder into `variationRadarChartParity.test.ts` and confirm
      no divergence against legacy `SessionStats.lastSession` on the real fixture
      (soft-warn tier, same pattern as the rest of this harness). This is a test-file-only
      change and stays committed. (Target:
      `packages/app/src/pipeline/variationRadarChartParity.test.ts`. Test: `npm test -w
packages/app -- variationRadarChartParity`)

### Phase C — Swap `VariationRadarChart.tsx` itself (#460), verify, then revert the flip

- [x] Task 5 [WIRE + VERIFY, THEN REVERT CALL SITE for the component; KEEP the promoted
      util]: Promote `snapshotVariationsFromPipeline`'s reduction logic from `testUtils/`
      to a standalone, unit-tested runtime util (new module — this part stays committed),
      then swap `VariationRadarChart.tsx`'s props from `rows: ConjugateDataPair[]` /
      `stats: SessionStats` to pipeline-derived data (the promoted util's snapshot +
      Task 3's last-session-detail map), removing the `normalizeToBaseE1RM`/`@dyel/core`
      call. Verify against `variationRadarChartParity.test.ts` + a build, then **revert
      only `VariationRadarChart.tsx`'s props/logic** back to its current `@dyel/core`
      state before committing. (Target: new runtime util file, e.g.
      `packages/app/src/utils/variationSnapshot.ts` (kept), plus
      `packages/app/src/components/charts/VariationRadarChart.tsx` (reverted after
      verification). Test: `npm test -w packages/app -- variationRadarChartParity && npm
run build -w packages/app`)
- [x] Task 6 [WIRE + VERIFY, THEN REVERT CALL SITE]: While Task 5's swap is live, update
      the caller, `LiftTabPanel.tsx`, to pass the new pipeline-derived props instead of
      `rows`/`stats`, to verify the full wiring end-to-end. Revert this alongside Task 5.
      (Target: `packages/app/src/components/pages/LiftTabPanel.tsx`. Test: `npm test -w
packages/app`)
- [x] Task 7 [WIRE + VERIFY, THEN REVERT CALL SITE]: Full regression QA — both builds,
      both test suites, plus a manual dev-server smoke test of the variation radar + its
      tooltip content (date/sets/reps/weight/RPE still rendering correctly) across all
      three lift tabs — while Task 5/6's swap is live, before reverting. (Target: n/a.
      Test: `npm run build -w packages/pipeline && npm run build -w packages/app && npm
test -w packages/pipeline && npm test -w packages/app`)

### Phase D — Docs cleanup

- [x] Task 8: Update `MIGRATION_PLAN.md`, `migration/ConjugateCharts.md`,
      `migration/VariationRadarChart.md`, and `APP_COMPONENTS.md` to reflect verified,
      swap-ready status (parity confirmed via full wire-and-revert dry run) rather than
      claiming the components are actually swapped in committed code — since the live
      wiring is reverted before commit per the note above. Update `HANDOFF.md`
      accordingly. Do not close GitHub issues #459/#460 directly — they close
      automatically when the PR(s) referencing "closes #459"/"closes #460" merge, which
      won't happen until the flip is actually committed in a future pass. (Target:
      `MIGRATION_PLAN.md`, `migration/ConjugateCharts.md`,
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

**Current pass scope:** all of Tasks 1–8 execute now, including the actual wiring, for
verification purposes — but Tasks 1, 2, 5, 6, 7 touch call sites
(`ConjugateCharts.tsx`/`useConjugateChartData.ts`/`VariationRadarChart.tsx`/
`LiftTabPanel.tsx`) that must be **reverted to their current `@dyel/core`-calling state
before the final commit**, so no user-facing behavior actually changes in this pass.
Tasks 3, 4, and the promoted-util half of Task 5 are net-new infra with no prior
behavior to preserve, so they stay committed as-is. Before committing: diff each
call-site file against its pre-pass version and confirm it matches (revert if not), then
run the full test suite one more time to confirm the reverted state is exactly today's
passing baseline plus new infra files.
