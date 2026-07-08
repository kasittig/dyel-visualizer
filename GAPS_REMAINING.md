# GAPS_REMAINING — scoping pass for full core-vs-pipeline data parity

Scoping-only pass across every `packages/app` component still tracked in
`APP_COMPONENTS.md`/`MIGRATION_PLAN.md`. No production code changed. Goal: enumerate,
per component, exactly what stands between "parity test passes (soft-warn or partial)"
and "pipeline output is an exact match, gate satisfied, component safely swappable" —
per the migration gate in `APP_COMPONENTS.md` ("pipeline and `@dyel/core` must produce
_exactly_ matching output ... not a soft-warn tolerance").

Verified by actually running `npm test -w packages/app` (20 files / 199 tests, all green
— green because divergence is soft-warned, not hard-asserted) and reading the
`console.warn` diff output directly, not just the docs. **One finding below (the
`MIN_SAMPLES` change) was only visible by doing this — the committed docs don't yet
reflect it.**

## 0. Critical/blocking finding: uncommitted `MIN_SAMPLES` change regresses already-"done" parity

`packages/pipeline/src/pipeline.ts` has an **uncommitted** change (`git diff` on this
branch) bumping `MIN_SAMPLES` from `1` to `3`, with a comment citing issues #429/#451.
This is not a no-op — it measurably widens divergence on components previously treated
as at-parity or close to it, and the accompanying test edits **weaken assertions to
paper over the new gap** rather than fixing it:

- `totalChartParity.test.ts`: previously hard-asserted `missingInA === 0 &&
missingInB === 0` for squat/bench/deadlift/total; the uncommitted diff exempts `bench`
  from the hard-assert entirely (comment: "bench is soft-warn only") and drops the
  `missingInB === 0` check globally. Live run output today: `bench missingInB=6
maxRelDiff=14.7%`, `deadlift missingInB=5 maxRelDiff=8.4%`, `total missingInB=5
maxRelDiff=9.5%`, `squat maxRelDiff=16.2%` (squat was already soft-warn, but 16.2% is
  much larger than the ~0.7% previously documented in `TotalChart.md`/`packages/app/CLAUDE.md`).
- `sigmaTabParity.test.ts`: same pattern — `missingInB === 0` assertion on the `volume`
  series was deleted, comment admits "some dates may not have any fitted variants."
- `conjugateChartParity.test.ts`'s `normalized` composite (not touched by this diff, but
  downstream of the same pipeline change) now also shows `missingInB=8` (bench) /
  `missingInB=6` (deadlift) — dates the pipeline silently drops that legacy still
  reports — which isn't reflected in `ConjugateCharts.md`'s "Finding #6 fixed" writeup
  (that writeup's 7.0%/0.4% numbers predate this change).

**This is a real regression against the project's own migration gate**, not a docs
staleness issue: `MIN_SAMPLES = 3` causes the pipeline to silently drop dates/variants
that have real legacy data, for exercises with only 1–2 logged sessions (common for
"long tail" conjugate variations — this fixture has dozens of n=1 variants). The
previous default (`MIN_SAMPLES = 1`) was correctly analyzed in `ConjugateCharts.md`
Finding #2 as "equivalent to legacy's own gating." Raising it to 3 breaks that
equivalence and reintroduces exactly the kind of gap the whole reconciliation effort
was closing.

**Remaining work:**

- [x] Task 0a: Decide, with explicit sign-off, whether `MIN_SAMPLES=3` is an intentional
      product change (fewer degenerate single-sample fits) or an accidental regression
      from local debugging. If intentional, it needs its own reconciliation pass (a
      pipeline-side "insufficient sample" state that legacy also models, not just a
      silently-dropped point) before any _other_ component can be swapped, since every
      other finding in this doc is now partly downstream of it. (Target:
      `packages/pipeline/src/pipeline.ts`. Test: `npm test -w packages/pipeline && npm
  test -w packages/app`)

  **Resolved (verified 2026-07-08):** `packages/pipeline/src/pipeline.ts` has
  `MIN_SAMPLES = 1` with no uncommitted diff — the `=3` change described above is no
  longer present in the working tree at all. In effect the "not intentional, revert"
  branch was taken. No explicit sign-off note/commit was found documenting this
  decision directly, so if that's needed for the record it's still outstanding, but the
  code and tests are no longer in the regressed state.

- [x] Task 0b: Whichever way Task 0a resolves, restore hard-assert coverage on
      `totalChartParity.test.ts` (bench, `missingInB`) and `sigmaTabParity.test.ts`
      (volume `missingInB`) to what it was before this diff — don't leave weakened
      assertions as the committed state. (Target:
      `packages/app/src/pipeline/totalChartParity.test.ts`,
      `packages/app/src/pipeline/sigmaTabParity.test.ts`. Test: same files, `npm test -w
  packages/app`)

  **Resolved (verified 2026-07-08):** `totalChartParity.test.ts`'s hard-assert block
  (`missingInA === 0 && missingInB === 0`) covers all series including bench, no
  exemption present — 17/17 passing, live run shows `missingInB=0` for
  squat/bench/deadlift/total. `sigmaTabParity.test.ts`'s `volume` series hard-assert
  still explicitly checks `missingInB: 0` — 17/17 passing.

  **New open item found while verifying this:** the `missingInB` gap is closed, but
  `maxRelDiff` in today's live run (squat 16.2%, bench 22.1%, deadlift 25.4%, total
  16.3%, all soft-warn only) is _larger_ than the "regressed" numbers this section
  originally cited (e.g. bench 14.7%, deadlift 8.4%, total 9.5%). Task 0 as scoped
  (missing dates) is done, but value-magnitude divergence does not look better than
  when this doc was written and should get its own look before §0 is considered fully
  closed end-to-end.

### 0c–0e: root-cause and close the current squat/bench/deadlift `maxRelDiff` gap — RESOLVED

**Superseded finding, kept for history:** Task 0c originally named a fit-window mismatch
(legacy fits on date-range-filtered pairs, pipeline fits on all-time history) as the
"high confidence" root cause. A later session (`LEGACY_MIGRATION.md`) landed that exact
fix (legacy → all-time fit window, matching pipeline) and found the numbers moved the
_wrong_ direction (squat 16.2%→18.1%, total 16.3%→16.9%) — disproving fit-window
mismatch as the dominant driver. A disposable reversal experiment (scoping pipeline's
fit to `ui.dateRange` instead) made things worse in that direction too, ruling it out
definitively.

**Actual root cause (found via direct model diff, `LEGACY_MIGRATION.md`):** legacy's
`splitByEffort` (`packages/app/src/utils/appDataUtils.ts:23-38`) excludes
volume/speed-work sessions (`sets === 1 || rpe !== null` gate) before ever fitting;
`@dyel/pipeline`'s `fitNormalizationModel` had no equivalent exclusion and fit on the
entire tagged history, including 5x5-style volume rows. Concretely: squat's `Box Squat`
variant fit on `sampleCount=2` (legacy) vs `n=3` (pipeline) for the same fixture row set.

**Fix landed this session** (`VOLUME_FILTER_DESIGN.md`, "Option D"): added a typed
`sets?: number` field to `SetRecord` (`packages/pipeline/src/types.ts`), populated by
the CSV parser with legacy's default-to-1 fallback (`packages/pipeline/src/parse/csv.ts`),
and a pre-fit filter in `packages/pipeline/src/pipeline.ts` (predicate: `sets ===
undefined || sets === 1 || rpe !== undefined` — the `undefined` branch keeps
freeform-sourced records, which have no `sets` concept, passed through unfiltered rather
than wrongly excluded). CSV-only scope, freeform `<sets>x<reps>` grammar explicitly
deferred (see `VOLUME_FILTER_DESIGN.md` "Not addressed").

- [x] Task 0c/0d/0e — **closed.** Re-ran `totalChartParity.test.ts`/
      `sigmaTabParity.test.ts` after the fix: squat 18.1%→**0.0%**, bench
      21.5%→**0.7%**, deadlift 25.4%→**0.4%**, total 16.9%→**0.0%** (pushPull, not
      previously tracked in this doc, sits at 0.2%). All four residuals now land in the
      same "accepted divergence" tier `packages/app/CLAUDE.md` already documents
      elsewhere (squat 0.7%/pushPull 0.3%, since superseded by the numbers above — see
      that file's own update). Full monorepo suite (650/650 tests, 3/3 builds) verified
      green after the change. `packages/app/CLAUDE.md`'s "Handling known divergence"
      section has been updated with the new numbers (this doc's re-baseline
      requirement is satisfied).

## 1. Fully migrated, at or near parity (no action needed to keep current status)

`TotalChart`, `SigmaTab`, `SessionBarChart`, `SigmaChart`, `DateLineChart` — all already
call `runPipeline` only, all have passing parity tests. Their only open item is the
`MIN_SAMPLES` regression in §0 above (shared infra, not component-specific). One small
leftover: `TotalChart.tsx` still has a type-only `ChartPoint` import from `@dyel/core`
(no runtime call) — `migration/TotalChart.md`'s last remaining item.

- [ ] Task 1: Re-export `ChartPoint` from `@dyel/pipeline` and update `TotalChart.tsx`'s
      import. Pure type-only cleanup, no behavior change expected. (Target:
      `packages/pipeline/src/index.ts` (or wherever the barrel lives),
      `packages/app/src/components/charts/TotalChart.tsx`. Test: `npm run build -w
  packages/pipeline && npm run build -w packages/app && npm test -w packages/app --
  totalChartParity`)

## 2. `RepCalculator` / `StrengthScoreCalculator` — ready, smallest remaining gap

Both have exact-match parity tests passing today (`repCalculatorParity.test.ts`: 16/16;
`strengthScoreCalculatorParity.test.ts`: 6/6). `StrengthScoreCalculator`'s test does
still log one real mismatch (`console.log`, not even a warn): female 60kg/250kg,
Schwartz-Malone score `48` (legacy) vs `47` (pipeline) — a rounding-boundary difference,
not currently hard-asserted against. Everything else matches exactly (Wilks, DOTS, and
every other SM case).

**Remaining work:**

- [ ] Task 2a: Root-cause the single SM rounding mismatch (female 60kg/250kg: 48 vs 47)
      — likely a floating-point rounding-direction difference in the Schwartz-Malone
      formula or its percentile-rank step. Fix or explicitly document as an accepted
      rounding-boundary case before treating the test as gate-passing. (Target:
      `packages/pipeline/src/derive/athlete.ts`. Test: `npm test -w packages/app --
  strengthScoreCalculatorParity`)
- [ ] Task 2b: Swap `RepCalculator.tsx` to `usePipelineRepCalculator` +
      `findBestE1RMFromPipeline`, passing `inputMode`/`url`/`pastedText`/`refreshToken`
      from `App.tsx`. (Target: `packages/app/src/components/shared/RepCalculator.tsx`,
      `packages/app/src/App.tsx`. Test: `npm test -w packages/app -- repCalculatorParity
  && npm run build -w packages/app`)
- [ ] Task 2c: Swap `StrengthScoreCalculator.tsx`'s `calculateMetrics` call to
      `computeStrengthScores` (same signature). Do this after 2a lands so the swap isn't
      shipping a known, undocumented rounding gap. (Target:
      `packages/app/src/components/shared/StrengthScoreCalculator.tsx`. Test: `npm test
  -w packages/app -- strengthScoreCalculatorParity && npm run build -w packages/app`)

## 3. `ConjugateCharts` — real gap remaining: normalized-composite value divergence

Per-variation series parity is essentially exact on the fixture today (every matched
variation shows `missingInA=0, missingInB=0`, `maxAbsDiff` ≤ ~1 lb / ≤1.1%). The
remaining real gap is entirely in the `normalized` composite:

- Squat: exact (0%).
- Bench: `maxAbsDiff=5, maxRelDiff=3.8%`, **and `missingInB=8`** (8 legacy dates with no
  pipeline counterpart — this `missingInB` is new, attributable to §0's `MIN_SAMPLES`
  change, not the addlWt-offset approximation `ConjugateCharts.md` documents).
- Deadlift: `maxAbsDiff=1, maxRelDiff=0.4%`, `missingInB=6` (same `MIN_SAMPLES` symptom).

`ConjugateCharts.md`'s own writeup (Finding #6, "Design B") frames the _value_
divergence (was 9.8%/5.1%, now 7.0%/0.4% per that doc's last recorded run) as an
accepted ceiling of legacy's own e1RM-space approximation — reasonable, and not
re-litigated here. But the **`missingInB` counts are a new, distinct, unresolved gap**
introduced by §0, layered on top of the accepted approximation ceiling, and conflated
in the current doc because the doc's numbers predate the `MIN_SAMPLES` bump.

**Remaining work:**

- [ ] Task 3a: Depends on Task 0a/0b. Once `MIN_SAMPLES` is resolved, re-run
      `conjugateChartParity.test.ts` and re-baseline the `normalized` composite numbers
      cleanly (isolate "approximation ceiling" from "sample-gating drop") before
      deciding whether Finding #6's residual is actually closed to spec.
- [ ] Task 3b: Component swap-over itself (`ConjugateCharts.tsx` /
      `useConjugateChartData.ts` off `@dyel/core`) is still not done — `TASK_LIST.md`'s
      Phase A describes a wire-verify-then-revert dry run for this, not a committed
      swap. This is the actual remaining action item once 3a's numbers are clean.
      (Target: `packages/app/src/hooks/conjugate/useConjugateChartData.ts`,
      `packages/app/src/components/conjugate/ConjugateCharts.tsx`. Test: `npm test -w
  packages/app -- conjugateChartParity`)

## 4. `VariationRadarChart` — two real gaps, one newly quantified this session

`migration/VariationRadarChart.md` names two blockers: (1) shared normalization
divergence with `ConjugateCharts` (see §3), and (2) missing last-session tooltip detail
(date/sets/reps/weight/RPE). A `lastSessionDetail.ts` builder + parity coverage exists
now (uncommitted: `packages/app/src/pipeline/lastSessionDetail.ts`,
`lastSessionDetail.test.ts`, and new assertions wired into
`variationRadarChartParity.test.ts`), per `TASK_LIST.md` Phase B. Running it surfaces
**two concrete, previously-undocumented gaps**, not just "not sourced yet":

- **Unit mismatch (real bug, not a display nuance).** For every matched label, the
  pipeline-derived `weight` is legacy's value converted to kg while legacy's is in the
  sheet's native unit (lbs, in this fixture) — e.g. squat `Box Squat`: legacy
  `weight=215`, pipeline `weight=97.52228` (215 lbs ≈ 97.5 kg). `date`/`sets`/`reps`/
  `rpe` all match exactly where the label is found at all. `buildLastSessionDetail`
  (`lastSessionDetail.ts`) reads `TaggedSetRecord.weight` directly, which is
  pipeline-internal (kg), with no unit-conversion step back to the athlete's display
  unit the way the rest of the app's `ChartPoint`/ `RechartsRow` pipeline-facing values
  do. This is a straightforward fix (convert using the same unit-conversion utility the
  rest of the pipeline-facing chart code already uses) but is not done today, and the
  parity test only soft-warns on it rather than catching it as a hard bug.
- **Scope mismatch inflates the "missing" count (test-harness issue, not a real gap).**
  The overwhelming majority of `console.warn` lines are "legacy has X but pipeline
  missing" for clearly unrelated exercises (accessories like `DB Curl`, `Facepull`,
  `Lat Pulldown`, and even other lift types' variations, e.g. squat's comparison
  listing `Bench (American Bar)` and `Deadlift (opposite)` as "missing"). This is
  because `legacyLastSessions[lift] = stats.lastSession` in the test is legacy's
  **global** last-session map (every exercise ever logged), while
  `pipelineLastSessions[lift]` is correctly scoped to `lift:${liftType}`-tagged records
  only via `buildLastSessionDetail`'s `matches(r.tags, { all: ['lift:${liftType}'] })`
  filter. The comparison itself needs to filter legacy's map down to the same lift-type
  scope before diffing, or the "missing" count will always look enormous regardless of
  real coverage. This inflates the appearance of the gap and should be fixed before
  anyone tries to read signal out of this test's current output.

**Remaining work:**

- [ ] Task 4a: Fix the unit-conversion gap in `buildLastSessionDetail` — convert
      `weight` to the display unit before returning `LastSessionDetail`, matching how
      other pipeline-facing chart data already round-trips units. (Target:
      `packages/app/src/pipeline/lastSessionDetail.ts`. Test:
      `packages/app/src/pipeline/lastSessionDetail.test.ts`, `npm test -w packages/app --
  variationRadarChartParity`)
- [ ] Task 4b: Fix the test-harness scope mismatch — filter
      `legacyLastSessions[lift]` down to the same `lift:${liftType}` scope (or
      equivalent legacy filter) before diffing against `pipelineLastSessions[lift]`, so
      the "missing" warnings reflect real coverage gaps, not cross-lift-type noise.
      (Target: `packages/app/src/pipeline/variationRadarChartParity.test.ts`. Test: same
      command)
- [ ] Task 4c: After 4a/4b, re-run and determine whether last-session detail parity is
      actually exact-match-ready (promote to hard-assert) or whether real gaps remain —
      do not assume "soft-warn passes" means done.
- [ ] Task 4d: Blocker (1) — the shared `ConjugateCharts` normalization divergence (see
      §3) — must also close before this component's swap-over per
      `VariationRadarChart.md`'s explicit reasoning (avoid reintroducing the same bug
      into a second user-facing chart).
- [ ] Task 4e: Component swap-over itself (`VariationRadarChart.tsx` props from
      `rows`/`stats` to pipeline-derived snapshot + last-session map, plus
      `LiftTabPanel.tsx` wiring) per `TASK_LIST.md` Phase C — blocked on 4a–4d.

## 5. `DiagnosticsPanel` — real, unresolved pipeline-side feature gap (largest remaining item)

Confirmed directly via the live parity test run (`diagnosticsPanelParity.test.ts`),
which soft-warns: `Deadlift diagnostic status: pipeline(opt=0,weak=1,over=2) vs
legacy(opt=4,weak=1,over=3)` — a real, large classification disagreement (legacy finds
4 optimal variants, pipeline finds 0), consistent with `DiagnosticsPanel.md`'s
documented root cause: pipeline's flat tolerance-band classification is a fundamentally
different model from legacy's baseline min/max range, not a relabeling. This is the
single largest remaining gap in the whole migration set — it's a missing-capability gap,
not a divergence-to-reconcile gap.

Per `DiagnosticsPanel.md`, four separate things are missing from `@dyel/pipeline`, and
none of them have design sign-off yet:

1. Canonical → display-name resolution (pipeline has none at all).
2. Modifier-percentage-baseline-range model (`averageIndex`/`expectedBaseline` — legacy
   derives this from equipment/stance/bar modifier tables; pipeline has no equivalent).
3. Status classification reconciliation (range-based vs flat-tolerance-band — a
   behavioral model decision, not a bug fix).
4. Additional-weight offset data for the table's chain/band label formatting.

Plus a structural prop mismatch: `usePipelineDiagnostics` self-fetches
(`inputMode`/`url`/`pastedText`/`refreshToken`) vs `DiagnosticsPanel.tsx`'s current
pre-computed `rows`/`targetName`/`variantFactor`/`addlWtOffset` props — meaning
`LiftTabPanel.tsx`'s prop-drilling needs rework too, not just this component.

**Remaining work (each needs its own scoping/sign-off pass — this is the biggest
standalone body of work in the whole migration, not a single task):**

- [ ] Task 5a: Design and propose a canonical→display-name resolution mechanism for
      `@dyel/pipeline` (new field on `TaggedSetRecord`/`VariantAssessment`, or a
      sibling lookup function) — proposed pipeline change, needs sign-off before
      implementation. (Target: `packages/pipeline/src/analyze/diagnose.ts` or new
      module. Test: new unit test alongside.)
- [ ] Task 5b: Design and propose a modifier-percentage-baseline-range model
      equivalent to legacy's equipment/stance/bar modifier tables
      (`packages/core/src/load/generateDiagnostics.ts`), exposed as
      `averageIndex`/`expectedBaseline` (or pipeline-native equivalents). Needs sign-off
      — this is a genuine modeling decision (issue #461), not wiring.
- [ ] Task 5c: Reconcile the status-classification model (range-based vs
      flat-tolerance) — decide which model `@dyel/pipeline` should adopt, or whether
      both need to coexist. Needs sign-off; this alone explains the largest single
      divergence number seen in this session's test run.
- [ ] Task 5d: Source additional-weight offset data for display formatting (likely a
      smaller lift once `model.addlWtOffset` — already computed per §3's Finding #6 fix
      — is exposed through `diagnose()`'s output shape).
- [ ] Task 5e: Once 5a–5d land, rework `usePipelineDiagnostics`'s prop surface (or add
      an adapter) to match `DiagnosticsPanel.tsx`'s current pre-computed-props shape,
      and update `LiftTabPanel.tsx`'s prop-drilling accordingly.
- [ ] Task 5f: Swap `DiagnosticsPanel.tsx` over and promote
      `diagnosticsPanelParity.test.ts` from soft-warn to hard-assert.

Tracked: [#461](https://github.com/kasittig/dyel-visualizer/issues/461). This is
correctly flagged in `MIGRATION_PLAN.md` as the hardest remaining item and a hard
dependency of `LiftTabPanel` — nothing found this session changes that assessment,
except that the live test run now gives a concrete number (`opt=0 vs opt=4` for
deadlift) to cite as evidence of how large the classification gap actually is.

## 6. `LiftTabPanel` — composition root, correctly sequenced last

No new findings beyond what `LiftTabPanel.md`/`MIGRATION_PLAN.md` already state: hard
blocked on §3, §4, and §5 all landing (component swap-overs, not just parity-test
passes). Its own scope (`filterByDateRange`, `DeadliftStancePreference`/`LiftType`) is
comparatively small and mechanical once its children are unblocked — no additional gap
found here.

- [ ] Task 6: Once §3/§4/§5 close, migrate `filterByDateRange` to operate on pipeline's
      `Point[]`/`RechartsRow[]` shapes and replace `DeadliftStancePreference`/`LiftType`
      with `AthleteContext`/pipeline equivalents, per `LiftTabPanel.md`'s existing plan.
      Add `liftTabPanelParity.test.ts`. (Target:
      `packages/app/src/components/pages/LiftTabPanel.tsx`. Test: `npm test -w
  packages/app -- liftTabPanelParity`)

## 7. `ValidatorPage` — not a data-parity gap, a scope question

No pipeline counterpart exists or is proposed to exist — `ValidatorPage` validates raw
sheet shape before any parsing/normalization, orthogonal to core-vs-pipeline output
parity. Nothing found this session changes `ValidatorPage.md`'s conclusion. The only
open action is non-technical:

- [ ] Task 7: Get an explicit answer to "is `ValidatorPage` in scope for migration at
      all?" Regardless of the answer, add a legacy-locking validation test (`it.each`
      over representative sheet shapes) so a future decision has a regression safety
      net. (Target: `packages/app/src/hooks/infra/useSheetValidation.ts` or
      `useTextValidation.ts` test. Test: `npm test -w packages/app -- ValidatorPage`)

## Summary — priority order for closing full data parity

1. ~~**§0 (`MIN_SAMPLES`)**~~ — **fully resolved** (`MIN_SAMPLES` regression reverted,
   fit-window investigation completed and superseded, volume/speed-work filtering gap
   found and closed — see §0c–0e). squat/bench/deadlift/total `maxRelDiff` now 0.0-0.7%,
   all other items' numbers below are reliable to reason about again.
2. **§5 (`DiagnosticsPanel`)** — largest, most architecturally significant gap; needs
   sign-off on three separate modeling questions before any implementation starts.
3. **§3/§4 (`ConjugateCharts`/`VariationRadarChart`)** — §3's approximation ceiling is
   arguably acceptable already (pending §0 cleanup to confirm); §4's two newly-found
   issues (unit-conversion bug, test-harness scope mismatch) are cheap, concrete fixes
   that should happen before anyone tries to read signal from that parity test again.
4. **§2 (`RepCalculator`/`StrengthScoreCalculator`)** — smallest remaining lift; one
   rounding case to resolve, then two mechanical swaps.
5. **§6 (`LiftTabPanel`)** — mechanical once 2–4 land.
6. **§7 (`ValidatorPage`)** — scope decision, no technical dependency on the rest.
7. **§1 (`TotalChart` cleanup)** — trivial, any time.
