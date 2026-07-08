# App components still on `@dyel/core` (migration candidates to `@dyel/pipeline`)

Inventory of `packages/app/src` components/hooks that still depend on `@dyel/core`,
per the pipeline migration boundary rule (migrated components must call only
`runPipeline`, never `@dyel/core`). Components already fully migrated (`TotalChart`,
`SigmaTab`, `SessionBarChart`, `SigmaChart`, `DateLineChart`) are omitted here — see
`HANDOFF.md` for that history.

**Migration gate: the pipeline and `@dyel/core` backends must produce _exactly_ matching
output — not just "close" or within a soft-warn tolerance — before a component is switched
over.** A passing parity test with `console.warn` soft-warns is not sufficient sign-off for
the swap itself; soft-warn is a temporary tracking mechanism for an open divergence
investigation, not an accepted-tolerance policy (see `HANDOFF.md`). Promote to a hard-assert
parity test first, then swap the component.

## Ready to migrate (pipeline-native replacement + parity test exist, component not yet switched over)

These five have a working pipeline-native implementation and a parity test already in place,
but the component itself still calls `@dyel/core` at runtime — swapping it over is
intentionally deferred pending exact parity (see gate above). Two of them (`RepCalculator`,
`StrengthScoreCalculator`) are genuinely small, low-risk swaps (swap the hook/function call,
update the prop signature) with an already-passing (exact-match) parity test. The other three
(`ConjugateCharts`, `DiagnosticsPanel`, `VariationRadarChart`) each carry a real, documented
blocker beyond "wire up the hook" — see each entry below before attempting those.

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
- `components/shared/DiagnosticsPanel.tsx` — still calls `generateDiagnostics`
  (`@dyel/core`). Pipeline-native replacement exists: `usePipelineDiagnostics` hook
  (`packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts`) wraps `runPipeline` +
  `PipelineResult.diagnostics`, with a soft-warn parity test at
  `packages/app/src/pipeline/diagnosticsPanelParity.test.ts`. **Swap is intentionally
  deferred** — closer scoping against the component's actual render logic (not just the
  parity test's structural checks) found this is not a small wiring change: pipeline's
  `diagnose()` has no canonical→display-name resolution (the table needs `displayName`,
  pipeline only has a bare `canonical` slug), no modifier-percentage-baseline-range model
  (the table needs `averageIndex`/`expectedBaseline` as a % range; pipeline only produces a
  flat `expectedE1rmKg`/`ratio`), a different status-classification model (not just a
  renamed enum — legacy uses a baseline min/max range, pipeline a flat tolerance band), and
  no additional-weight offset data. `usePipelineDiagnostics`'s props
  (`inputMode`/`url`/`pastedText`/`refreshToken`, self-fetching) also don't match the
  component's current pre-computed `rows`/`targetName`/`variantFactor`/`addlWtOffset` props,
  meaning a swap would also touch `pages/LiftTabPanel.tsx`'s prop-drilling. See
  `migration/DiagnosticsPanel.md`'s Status section for full detail. Held to the same bar as
  `VariationRadarChart` below — missing pipeline functionality is a proposed pipeline
  change, not a client-side workaround. Tracked: [#461](https://github.com/kasittig/dyel-visualizer/issues/461).
- `components/shared/RepCalculator.tsx` — still calls `findBestE1RM` +
  `buildSessionStats` (`@dyel/core`). Pipeline-native replacement ready: new
  `usePipelineRepCalculator` hook (`packages/app/src/hooks/pipeline/usePipelineRepCalculator.ts`)
  - `findBestE1RMFromPipeline` (`packages/app/src/pipeline/repCalculatorUtils.ts`,
    mirroring legacy `findBestE1RM`'s logic over pipeline `Point[]`/
    `NormalizationModel` data). Parity test passing at
    `packages/app/src/pipeline/repCalculatorParity.test.ts`. To swap: replace the
    `findBestE1RM`/`buildSessionStats` calls with the new hook + helper, and pass
    `inputMode`/`url`/`pastedText`/`refreshToken` down from `App.tsx`.
- `components/shared/StrengthScoreCalculator.tsx` — still calls
  `calculateMetrics` (`@dyel/core`). Pipeline-native replacement ready: new
  `computeStrengthScores` function added to `@dyel/pipeline`
  (`packages/pipeline/src/derive/athlete.ts`, wrapping `wilks`/`dots` and
  adding Schwartz-Malone + percentile-rank support, matching legacy
  `LiftMetrics`'s output shape). Parity test passing at
  `packages/app/src/pipeline/strengthScoreCalculatorParity.test.ts`. To swap:
  this is a one-line change — replace the `calculateMetrics` import/call with
  `computeStrengthScores` (same signature, no prop changes needed).
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

`LiftTabPanel.tsx` is blocked on `ConjugateCharts`, `VariationRadarChart`, and
`DiagnosticsPanel` swapping over first (see `MIGRATION_PLAN.md`); its own
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

`ConjugateCharts`, `DiagnosticsPanel`, `RepCalculator`, `StrengthScoreCalculator`, and
`VariationRadarChart` each have a pipeline-native replacement and a parity test (see "Ready
to migrate" above), but the actual component swap-over is intentionally deferred for all
five pending an exact-match parity result (see gate at top) — the components still call
`@dyel/core` at runtime. `ConjugateCharts` specifically was migrated once already and
**reverted** after the parity test surfaced real divergence from legacy (see `HANDOFF.md`);
any future attempt to swap it back over must close that divergence to an exact match first
(tracked: [#459](https://github.com/kasittig/dyel-visualizer/issues/459)).
`VariationRadarChart` shares the same underlying divergence risk (see its entry above); its
separate tooltip-data gap was resolved 2026-07-08 (`lastSessionDetail.ts`), leaving the
shared divergence as its only remaining blocker (tracked: [#460](https://github.com/kasittig/dyel-visualizer/issues/460)).
Both `ConjugateCharts` and `VariationRadarChart` had a 2026-07-08 wire-verify-revert dry
run confirming their swaps are mechanically ready (full test suites + builds green with
each swap live), but the call-site files were reverted afterward per explicit direction —
neither is a committed swap, both still call `@dyel/core` at runtime, and the exact-match
gate above still isn't met for either.
`DiagnosticsPanel` was initially assessed as a small swap too, but scoping it directly
against the component's render logic found a real gap instead (no canonical→display-name
resolution, no percentage-baseline-range model, a differently-classified status enum, no
add'l-weight offset data — see `migration/DiagnosticsPanel.md`'s Status section), so it's
held to the same "real blocker, not a wiring task" bar (tracked:
[#461](https://github.com/kasittig/dyel-visualizer/issues/461)). `RepCalculator` and
`StrengthScoreCalculator` are the two components closest to done — their parity tests
already validate exact-match replacement logic, so swapping them over should be a small,
well-understood change; no tracking issue needed.

See `MIGRATION_PLAN.md` for full sequencing across the remaining items.
