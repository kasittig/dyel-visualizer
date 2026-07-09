# App components still on `@dyel/core` (migration candidates to `@dyel/pipeline`)

Inventory of `packages/app/src` components/hooks that still depend on `@dyel/core`,
per the pipeline migration boundary rule (migrated components must call only
`runPipeline`, never `@dyel/core`). Components already fully migrated (`TotalChart`,
`SigmaTab`, `SessionBarChart`, `SigmaChart`, `DateLineChart`, `RepCalculator`,
`StrengthScoreCalculator`, `DiagnosticsPanel`) are omitted here — see `HANDOFF.md` for that history.

**Migration gate: the pipeline and `@dyel/core` backends must produce _exactly_ matching
output — not just "close" or within a soft-warn tolerance — before a component is switched
over.** A passing parity test with `console.warn` soft-warns is not sufficient sign-off for
the swap itself; soft-warn is a temporary tracking mechanism for an open divergence
investigation, not an accepted-tolerance policy (see `HANDOFF.md`). Promote to a hard-assert
parity test first, then swap the component.

## Ready to migrate (pipeline-native replacement + parity test exist, component not yet switched over)

These two have a working pipeline-native implementation and a parity test already in place,
but the component itself still calls `@dyel/core` at runtime — swapping it over is
intentionally deferred pending exact parity (see gate above). Each carries a real, documented
blocker beyond "wire up the hook" — see each entry below before attempting those.
(`RepCalculator`/`StrengthScoreCalculator` were the two low-risk exceptions to that pattern —
both have since been swapped over, see "Status" below.)

- `components/conjugate/ConjugateCharts.tsx` — still calls
  `useConjugateChartData` (`@dyel/core`'s `buildVariationChartData`
  internally) and imports `LINE_COLORS`/`RepCalcStats` directly from
  `@dyel/core`. This was previously migrated to `@dyel/pipeline` but was
  **deliberately reverted** back to `@dyel/core` (see `46f267f` "Revert
  ConjugateCharts from @dyel/pipeline back to @dyel/core" and
  `HANDOFF.md`) after divergence was found between the two
  implementations. Pipeline-native replacement still exists at
  `packages/app/src/pipeline/conjugateChartSpecs.ts` (a `DatasetSpec[]`
  builder with no other importer) and is exercised by the core-vs-pipeline
  regression harness at `packages/app/src/pipeline/conjugateChartParity.test.ts`
  — this parity test is what surfaced the divergence and is what any future
  re-migration attempt needs to satisfy (exact match, not soft-warn) before the
  component is swapped back over. A 2026-07-08 wire-verify-revert dry run confirmed the
  swap itself is mechanically clean (full suite + build green with the swap live) but
  the exact-match gate still isn't met (bench 7.0% / deadlift 0.4% `normalized`
  divergence remain soft-warned) — see `migration/ConjugateCharts.md`'s "Wire-verify-
  revert dry run" section. The call-site files were reverted after verification; still
  on `@dyel/core` at runtime. Tracked: [#459](https://github.com/kasittig/dyel-visualizer/issues/459).
- `components/charts/VariationRadarChart.tsx` — still calls
  `normalizeToBaseE1RM` and imports `ConjugateExercise` directly from
  `@dyel/core`. Pipeline-native replacement exists and is validated on the
  current fixture (no divergence observed) via `conjugateChartSpecs()` +
  `testUtils/diffVariationSnapshot.ts`'s `snapshotVariationsFromPipeline`/
  `snapshotVariationsFromLegacy`/`diffVariationSnapshots`, exercised by
  `packages/app/src/pipeline/variationRadarChartParity.test.ts`. **Swap is
  intentionally deferred**, for two reasons, not just one: (1) the underlying
  per-variation normalization is the same logic `ConjugateCharts` was
  **reverted away from** after its own parity test surfaced real divergence
  (`46f267f`; see `HANDOFF.md`) — swapping this component now, before that
  divergence is root-caused and closed to an exact match, risks silently
  reintroducing the same bug into a second user-facing chart, even though this
  test file's soft-warn logging hasn't (yet) surfaced divergence on the current
  fixture; (2) ~~the pipeline snapshot only carries last-value e1RM numbers, not
  the last-session detail (date, sets, reps, weight, RPE) the component's
  tooltip currently renders~~ — **resolved 2026-07-08**: `packages/app/src/pipeline/lastSessionDetail.ts`
  (new, committed) sources this detail pipeline-natively, plus a promoted
  runtime util `packages/app/src/utils/variationSnapshot.ts` for the e1RM
  snapshot reduction. A 2026-07-08 wire-verify-revert dry run confirmed the full
  swap chain (`VariationRadarChart.tsx` + `LiftTabPanel.tsx`) works end-to-end
  (full suite + both builds green with the swap live), then reverted the
  call-site files — see `migration/VariationRadarChart.md`'s "Wire-verify-revert
  dry run" section. Blocker (1) still isn't resolved to an exact match (see
  `ConjugateCharts` entry above), so the swap remains deferred; do not attempt
  it for real until that gate is met. Tracked: [#460](https://github.com/kasittig/dyel-visualizer/issues/460).

## Not yet migrated

Components that still call `@dyel/core` for real business logic:

| Component                 | `@dyel/core` usage                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `pages/LiftTabPanel.tsx`  | `filterByDateRange`, `DeadliftStancePreference`, `LiftType`                                     |
| `pages/ValidatorPage.tsx` | `SheetValidationResult`, `ColumnInfo` (likely intentionally core-only — legacy sheet validator) |

`LiftTabPanel.tsx` is blocked on `ConjugateCharts` and `VariationRadarChart` swapping over
first (see `MIGRATION_PLAN.md`); its own `deadliftStance`-on-`AthleteContext` prerequisite
is already complete.
`ValidatorPage.tsx` is blocked on a scope decision ("is this even in scope for migration?"),
not sequencing — not yet raised.

## Supporting hooks (not components, but feed the above)

- `hooks/data/useIndexData.ts`
- `hooks/data/useLastSessionStats.ts`
- `hooks/data/useBaselineTargetExercises.ts`
- `hooks/conjugate/useConjugateData.ts`
- `hooks/infra/useSheetValidation.ts`
- `hooks/infra/useTextValidation.ts`

## Other `@dyel/core` consumers in `packages/app/src` (non-component)

- `utils/appUtils.ts`
- `utils/appDataUtils.ts`
- `utils/sheetCacheUtils.ts`

## Status

`ConjugateCharts` and `VariationRadarChart` each have a pipeline-native replacement and a
parity test (see "Ready to migrate" above), but the actual component swap-over is
intentionally deferred for both pending an exact-match parity result (see gate at top) —
the components still call `@dyel/core` at runtime. `ConjugateCharts` specifically was
migrated once already and **reverted** after the parity test surfaced real divergence from
legacy (see `HANDOFF.md`); any future attempt to swap it back over must close that
divergence to an exact match first (tracked: [#459](https://github.com/kasittig/dyel-visualizer/issues/459)).
`VariationRadarChart` shares the same underlying divergence risk (see its entry above); its
separate tooltip-data gap was resolved 2026-07-08 (`lastSessionDetail.ts`), leaving the
shared divergence as its only remaining blocker (tracked: [#460](https://github.com/kasittig/dyel-visualizer/issues/460)).
Both `ConjugateCharts` and `VariationRadarChart` had a 2026-07-08 wire-verify-revert dry
run confirming their swaps are mechanically ready (full test suites + builds green with
each swap live), but the call-site files were reverted afterward per explicit direction —
neither is a committed swap, both still call `@dyel/core` at runtime, and the exact-match
gate above still isn't met for either.
`RepCalculator`, `StrengthScoreCalculator`, and `DiagnosticsPanel` — previously the three
components closest to done — have since been swapped over (2026-07-08): all three now
consume their pipeline-native replacements at runtime with zero `@dyel/core` references,
and their tracking docs (`migration/RepCalculator.md`, `migration/StrengthScoreCalculator.md`,
`migration/DiagnosticsPanel.md`) have been deleted as fully completed. `DiagnosticsPanel`
now uses `usePipelineDiagnostics()` with two accepted scope decisions: (1) shows all-time
diagnostics instead of date-range-filtered (pipeline's shared model has no date-range param);
(2) renders signed equipment-offset values (e.g. "+12.3lbs") without equipment labels, since
pipeline has no raw-equipment-tag list on `VariantAssessment`. A new `'stale'` status was
added to distinguish variants past the staleness threshold (`staleDays` gate in `diagnose()`)
and is rendered distinctly (muted, "Stale" label) so users are aware of recency.

See `MIGRATION_PLAN.md` for full sequencing across the remaining items.
