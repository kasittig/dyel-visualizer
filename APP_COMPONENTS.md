# App components still on `@dyel/core` (migration candidates to `@dyel/pipeline`)

Inventory of `packages/app/src` components/hooks that still depend on `@dyel/core`,
per the pipeline migration boundary rule (migrated components must call only
`runPipeline`, never `@dyel/core`). Components already fully migrated (`TotalChart`,
`SigmaTab`, `SessionBarChart`, `SigmaChart`, `DateLineChart`, `RepCalculator`,
`StrengthScoreCalculator`, `DiagnosticsPanel`, `ConjugateCharts`) are omitted here — see
`HANDOFF.md` for that history.

**Migration gate: the pipeline and `@dyel/core` backends must produce _exactly_ matching
output — not just "close" or within a soft-warn tolerance — before a component is switched
over.** A passing parity test with `console.warn` soft-warns is not sufficient sign-off for
the swap itself; soft-warn is a temporary tracking mechanism for an open divergence
investigation, not an accepted-tolerance policy (see `HANDOFF.md`). Promote to a hard-assert
parity test first, then swap the component.

**Exception (2026-07-08): `ConjugateCharts`** was swapped over with its residual soft-warn
divergence (squat 0.0% / bench 0.7% / deadlift 0.4% `normalized`-composite, exactly matching
`TotalChart`'s own already-accepted baseline) explicitly accepted as a maintainer decision,
rather than promoted to a hard assert first — see `migration/ConjugateCharts.md`'s
"ConjugateCharts swap-over" section for the full rationale. This is a one-off, explicitly
approved exception to the gate above, not a change to the gate's general policy.

## Ready to migrate (pipeline-native replacement + parity test exist, component not yet switched over)

This one has a working pipeline-native implementation and a parity test already in place,
but the component itself still calls `@dyel/core` at runtime — swapping it over is
intentionally deferred pending exact parity (see gate above), or an explicit exception
decision like the one that unblocked `ConjugateCharts` (see above).
(`RepCalculator`/`StrengthScoreCalculator`/`ConjugateCharts` were the low-risk/explicitly-
approved exceptions to that pattern — all three have since been swapped over, see "Status"
below.)

- `components/charts/VariationRadarChart.tsx` — still calls
  `normalizeToBaseE1RM` and imports `ConjugateExercise` directly from
  `@dyel/core`. Pipeline-native replacement exists and is validated on the
  current fixture (no divergence observed) via `conjugateChartSpecs()` +
  `testUtils/diffVariationSnapshot.ts`'s `snapshotVariationsFromPipeline`/
  `snapshotVariationsFromLegacy`/`diffVariationSnapshots`, exercised by
  `packages/app/src/pipeline/variationRadarChartParity.test.ts`. `lastSessionDetail.ts`
  (new, committed 2026-07-08) sources last-session tooltip detail pipeline-natively, plus a
  promoted runtime util `packages/app/src/utils/variationSnapshot.ts` for the e1RM snapshot
  reduction — the tooltip-data gap that used to block this swap is resolved. A 2026-07-08
  wire-verify-revert dry run confirmed the full swap chain
  (`VariationRadarChart.tsx` + `LiftTabPanel.tsx`) works end-to-end (full suite + both builds
  green with the swap live), then reverted the call-site files — see
  `migration/VariationRadarChart.md`'s "Wire-verify-revert dry run" section. Now that
  `ConjugateCharts` has landed (see above), re-evaluate whether this swap can proceed the
  same way (explicit residual-acceptance decision) rather than waiting on a hard-assert exact
  match. Tracked: [#460](https://github.com/kasittig/dyel-visualizer/issues/460).

## Not yet migrated

Components that still call `@dyel/core` for real business logic:

| Component                 | `@dyel/core` usage                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `pages/LiftTabPanel.tsx`  | `filterByDateRange`, `DeadliftStancePreference`, `LiftType`                                     |
| `pages/ValidatorPage.tsx` | `SheetValidationResult`, `ColumnInfo` (likely intentionally core-only — legacy sheet validator) |

`LiftTabPanel.tsx` is blocked on `VariationRadarChart` swapping over first (see
`MIGRATION_PLAN.md`) — `ConjugateCharts` has landed (2026-07-08); its own
`deadliftStance`-on-`AthleteContext` prerequisite is already complete.
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

`VariationRadarChart` has a pipeline-native replacement and a parity test (see "Ready to
migrate" above), but the actual component swap-over remains deferred — see its entry above
for current status now that `ConjugateCharts` has landed (tracked:
[#460](https://github.com/kasittig/dyel-visualizer/issues/460)).

`ConjugateCharts` was swapped over onto `@dyel/pipeline` on 2026-07-08 (closes
[#459](https://github.com/kasittig/dyel-visualizer/issues/459)), following an earlier
migration attempt that was **deliberately reverted** (see `46f267f` "Revert ConjugateCharts
from @dyel/pipeline back to @dyel/core" and `HANDOFF.md`) after divergence was found. This
time, the residual soft-warn divergence (matching `TotalChart`'s own accepted baseline) was
explicitly accepted rather than closed to an exact match — see `migration/ConjugateCharts.md`.
As part of this swap, the "Competition variation" normalization-target dropdown (`targetName`/
`onTargetChange` on `ConjugateCharts.tsx`) was **intentionally deprecated, not carried
over** — per explicit product direction, the normalized composite now always tracks the
model's fixed lift-family baseline rather than a user-selected target exercise. `useConjugateChartData.ts`
(the old `@dyel/core`-backed hook) was deleted; its replacement is
`hooks/pipeline/usePipelineConjugateChartData.ts`, plus a new pipeline-native best-set-lookup
util (`pipeline/conjugateBestSet.ts`) that preserves the tooltip's sets/reps/weight/RPE detail.

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
