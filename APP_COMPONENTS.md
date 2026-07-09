# App components still on `@dyel/core` (migration candidates to `@dyel/pipeline`)

Inventory of `packages/app/src` components/hooks that still depend on `@dyel/core`,
per the pipeline migration boundary rule (migrated components must call only
`runPipeline`, never `@dyel/core`). Components already fully migrated (`TotalChart`,
`SigmaTab`, `SessionBarChart`, `SigmaChart`, `DateLineChart`, `RepCalculator`,
`StrengthScoreCalculator`, `DiagnosticsPanel`, `ConjugateCharts`, `VariationRadarChart`,
`LiftTabPanel`) are omitted here — see `HANDOFF.md` for that history.

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

Nothing currently in this state — `VariationRadarChart` (the last item here) was swapped
over 2026-07-09, closing [#460](https://github.com/kasittig/dyel-visualizer/issues/460). See
"Status" below for details.

## Not yet migrated

Components that still call `@dyel/core` for real business logic:

| Component                 | `@dyel/core` usage                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `pages/ValidatorPage.tsx` | `SheetValidationResult`, `ColumnInfo` (likely intentionally core-only — legacy sheet validator) |

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

`VariationRadarChart` was swapped over onto `@dyel/pipeline` on 2026-07-09 (closes
[#460](https://github.com/kasittig/dyel-visualizer/issues/460)). Following the exact
precedent set by `ConjugateCharts` (below): the component's previous cross-exercise
per-target normalization (`@dyel/core`'s `normalizeToBaseE1RM`) was **deprecated, not
ported** — the radar now shows each variation's raw, un-normalized last-session e1RM via
the new `hooks/pipeline/usePipelineVariationRadarData.ts` hook
(`snapshotVariationsFromPipeline` + `pipeline/lastSessionDetail.ts`). This was not a
soft-warn-tolerance exception to the migration gate above (unlike `ConjugateCharts`'
0.7%/0.4% acceptance) — the raw per-variation e1RM snapshot has genuine 0.0% divergence
from legacy on the real fixture, now a **hard-asserted** parity test (promoted from
soft-warn), so the gate is fully met for the data path that actually ships. The
still-nonzero _normalized_ (cross-exercise) divergence (bench ~21.5%) remains soft-warned
and untouched — it's no longer relevant to production since that code path was dropped, and
is retained purely as a historical/tracked measurement, same treatment as `ConjugateCharts`'
pre-deprecation dropdown numbers. `LiftTabPanel.tsx` (the last remaining migration item, see
`MIGRATION_PLAN.md`) is now unblocked. See `migration/VariationRadarChart.md`'s "VariationRadarChart
swap-over" section for full detail.

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

`LiftTabPanel` (the composition root, page tab for squat/bench/deadlift) was finalized on
2026-07-09 as a trivial completion: its `liftType` prop was widened to plain `string` (matching
its children `ConjugateCharts`/`VariationRadarChart`), and the `DeadliftStancePreference`
type-only import was kept per the precedent already established by `DiagnosticsPanel`. The only
remaining `@dyel/core` reference is that single type-only import; no runtime business logic
remains. No parity test was needed since `LiftTabPanel` does pure composition/prop-passing
with no data transformation.

See `MIGRATION_PLAN.md` for full sequencing across the remaining items.
