# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Task 13 (`DiagnosticsPanel`, issue
#461) is complete (see git history / prior handoff commits). This session focused entirely
on issue #459 (`ConjugateCharts`) — specifically, root-causing why its documented parity
numbers were stale and what the real current divergence is. **No code changes landed this
session** — every edit made was investigative/reverted; the working tree is clean at the
time of this handoff.

## Progress Overview

- **Re-checked issues #459/#460**: both still OPEN, no new comments/narrowing.
- **Found `migration/ConjugateCharts.md`'s documented parity numbers are stale.** The doc's
  last entry (a "2026-07-08 wire-verify-revert dry run") cites `normalized`-composite
  `maxRelDiff` of squat 0.0% / bench 7.0% / deadlift 0.4%, treated as an accepted
  approximation ceiling. Re-running `conjugateChartParity.test.ts` against current `HEAD`
  (`f9e1129`) shows squat 31.4% / bench 21.5% / deadlift 25.4% — squat is the tell, since it
  has zero `addlWt` (chain/band) canonicals, proving the regression is unrelated to the
  `addlWtOffset` story the docs tell.
- **Bisected the regression** (via a general-purpose agent checking out each intervening
  commit and re-running the test, restoring the repo afterward): introduced by commit
  `627fddf` ("Close volume/speed-work filtering parity gap"), which added a pre-fit filter in
  `packages/pipeline/src/pipeline.ts`:
  ```ts
  const fitInput = tagged.filter(
    (r) => r.sets === undefined || r.sets === 1 || r.rpe !== undefined
  );
  const model = fitNormalizationModel(fitInput, { minSamples: MIN_SAMPLES }, athlete);
  ```
  This strips almost all records for canonicals logged mostly as multi-set/no-RPE volume work
  (box squat, SSB squat, most deadlift stance/band variants), collapsing their fitted-sample
  count and starving `variantFactor` for those canonicals.
- **First fix attempt was WRONG — caught and reverted before landing.** Initial hypothesis:
  legacy's `buildSessionStats`/`fitVariantFactor` fits on the _full unfiltered_ session list
  (based on reading `conjugateChartParity.test.ts`'s own `beforeAll`, which calls
  `buildSessionStats(pairs, ...)` with unfiltered `pairs`), so `627fddf`'s fit-input filter
  was assumed to be a pipeline-side deviation from legacy. Reverting it (dropping the
  `fitInput` filter, fitting on full `tagged`) did improve `conjugateChartParity` numbers
  (squat 0.0%, bench 3.4%, deadlift 0.4%) but **regressed `totalChartParity` badly** (squat
  0.0%→18.1%, bench 0.7%→21.5%, deadlift 0.4%→25.4%, total 0.0%→16.9%, pushPull 0.2%→16.7%).
- **Root cause of the real discrepancy, found while investigating that regression**:
  `conjugateChartParity.test.ts`'s `beforeAll` (line 39) calls
  `buildSessionStats(pairs, ...)` with the **full, unfiltered** `pairs` — but this does NOT
  match real production legacy behavior. Confirmed by tracing the actual component data flow:
  - `App.tsx` line 365: `<LiftTabPanel rows={tabRows[liftTab].maxEffort} ...>`
  - `LiftTabPanel.tsx` line 42: `useLastSessionStats(rows, effectiveBaselineNames)` →
    `buildSessionStats(maxEffort-only rows, ...)`
  - Production ConjugateCharts stats (and TotalChart/SigmaTab's, via the same
    `tabRows[X].maxEffort`-sourced `sigmaPairs` in `App.tsx` line ~211) are **always fit on
    max-effort-only sessions**, never the full unfiltered pair list.
  - `totalChartParity.test.ts` correctly mirrors this (`allSigmaPairs` built from
    `tabRows.squat.maxEffort` etc., lines 53-57/91).
  - `conjugateChartParity.test.ts` does NOT mirror this — it's the outlier, calling
    `buildSessionStats(pairs, ...)` with the raw unfiltered list. **This is a test-harness bug,
    not a pipeline bug.** `627fddf`'s fit-input filter was actually correct (matches real
    legacy production behavior); the revert was based on a false premise.
- **Reverted the false-premise fix**: `git checkout -- packages/pipeline/src/pipeline.ts`,
  confirmed clean (`git status --porcelain` empty) and pipeline package still green
  (`npm run build -w packages/pipeline` clean, `npm test -w packages/pipeline` 12 files/144
  tests passing) — i.e. back to the pre-session baseline, no regressions introduced.

## Decisions Made & Rationale

- **Did not implement any fix this session** — the investigation revealed the initial
  diagnosis was wrong partway through, and correcting course (reverting) took priority over
  landing a fix based on a false premise. No sign-off was sought for a fix because there isn't
  yet a confirmed-correct one to sign off on.
- **User confirmed reverting the erroneous `pipeline.ts` change** rather than leaving it
  uncommitted for a future session to clean up (auto-mode's destructive-action guard
  correctly blocked the initial attempt to discard it without explicit confirmation).

## Open TODOs

1. **Fix `conjugateChartParity.test.ts`'s test-harness bug**: change its `beforeAll` (around
   line 39) to call `buildSessionStats` with max-effort-filtered pairs (build a
   `tabRows[lift].maxEffort`-sourced list, matching `totalChartParity.test.ts`'s
   `allSigmaPairs` pattern and real production behavior), instead of the raw unfiltered
   `pairs`. This is the next concrete step — not yet started.
2. **Do NOT touch `packages/pipeline/src/pipeline.ts`'s `fitInput` filter** — it's correct as-
   is (matches production legacy behavior); this was the false lead from earlier in this
   session.
3. **After fixing the test harness**, re-run `conjugateChartParity.test.ts` to see the _real_
   current divergence numbers (previous soft-warn numbers, both the stale doc's 0.0/7.0/0.4
   and this session's 31.4/21.5/25.4, are unreliable until the harness bug is fixed) — this
   will determine whether there's still a genuine pipeline-vs-legacy gap to root-cause, or
   whether fixing the harness alone closes most/all of the apparent divergence.
4. **`migration/ConjugateCharts.md` needs a fresh update** once the above lands — its
   documented numbers are stale and should not be trusted as-is by a future session.
5. Resume Tasks 14-16 (`ConjugateCharts` swap, `VariationRadarChart`, `LiftTabPanel`) only
   after the above parity work is genuinely resolved — issues #459/#460 still open, no change
   from prior sessions on that front.

## Files Touched

**None.** Working tree is clean — every edit made this session (a `pipeline.ts` fit-input
filter removal, done via `feature-implementer`) was reverted after being found to rest on a
false premise. This handoff commit is the only change from this session.

## Suggested Next Skills

- No specific skill — next session should start directly on Open TODO #1 above (fix
  `conjugateChartParity.test.ts`'s `buildSessionStats` call to use max-effort-filtered pairs),
  then re-measure real divergence before deciding whether further pipeline-side work is
  needed for issue #459.
