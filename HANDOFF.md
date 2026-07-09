# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. Task 13 (`DiagnosticsPanel`, issue
#461) is complete (see git history / prior handoff commits). This session is a direct
follow-up to the previous one, which root-caused issue #459 (`ConjugateCharts`)'s stale
parity numbers to a test-harness bug in `conjugateChartParity.test.ts` (Open TODO #1 from
that handoff) but landed no fix. **This session implemented and verified that fix** — see
"Progress Overview" below. Working tree has two modified files at time of this handoff:
`packages/app/src/pipeline/conjugateChartParity.test.ts` (the fix) and
`migration/ConjugateCharts.md` (documentation of the fix and results); not yet committed.

## Progress Overview (this session)

- **Fixed `conjugateChartParity.test.ts`'s test-harness bug** (Open TODO #1 from prior
  handoff): its `beforeAll` was calling `buildSessionStats(pairs, ...)` with the raw,
  unfiltered pair list instead of max-effort-only rows. Changed it to build `allSigmaPairs`
  (max-effort rows from `tabRows.squat/bench/deadlift.maxEffort`), exactly mirroring
  `totalChartParity.test.ts`'s existing correct pattern, and pass that into
  `buildSessionStats` instead of raw `pairs`.
- **Verified the fix resolves the divergence**: real (non-stale) `normalized`-composite
  maxRelDiff numbers are now squat 0.0% / bench 0.7% / deadlift 0.4% — an **exact match**
  with `totalChartParity.test.ts`'s own documented residual baseline (squat 0.0%, bench
  0.7%, deadlift 0.4%, pushPull 0.2%, total 0.0%). This strongly confirms last session's
  31.4%/21.5%/25.4% numbers were purely a test-harness artifact, not a real pipeline
  regression, and that `627fddf`'s `fitInput` filter in `packages/pipeline/src/pipeline.ts`
  (correctly left untouched per last session's Open TODO #2) was never the problem.
- **Full suite verified green, no regressions**: `npm run build -w packages/pipeline && npm
run build -w packages/app && npm test -w packages/pipeline && npm test -w packages/app` —
  pipeline 12 files/144 tests, app 24 files/236 tests, all passing.
- **Updated `migration/ConjugateCharts.md`** with a new "Test-harness bug fix (2026-07-08,
  follow-up)" section documenting the root cause, fix, corrected numbers, and full
  verification — completing Open TODO #4 from the prior handoff.
- **Flagged, but did NOT decide, the gate-status question** (see that doc section's "Gate
  status decision point"): per `APP_COMPONENTS.md`'s literal "exact match, not soft-warn"
  migration gate wording, bench (0.7%) and deadlift (0.4%) are still technically non-zero,
  so the gate is not met in the strictest reading — even though the residual now exactly
  matches `TotalChart`'s own already-accepted baseline. This is presented as an open
  decision for a maintainer (promote as accepted residual vs. continue treating as
  gate-failing), not resolved unilaterally this session.

## Prior Session Progress (for reference)

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

## Decisions Made & Rationale (this session)

- **Implemented the fix identified last session** rather than re-investigating from scratch
  — last session's root-cause (test-harness bug, not pipeline bug) was trusted since it was
  independently confirmed via production data-flow tracing, not just inference.
- **Did not act on the "gate status" question** (whether 0.7%/0.4% residual should be
  promoted to accepted-baseline status) — this is an architectural/policy call about what
  `APP_COMPONENTS.md`'s gate means in practice, not a mechanical next-step, so it's left as
  an explicit open decision rather than resolved unilaterally.
- **Did not proceed to Tasks 14-16** (the actual `ConjugateCharts`/`VariationRadarChart`
  swap-over) even though numbers now match `TotalChart`'s precedent — that swap is gated on
  the still-undecided gate-status question above, so starting it now would be presumptuous.

## Prior Session's Decisions (for reference)

- Did not implement any fix in that session — the investigation revealed the initial
  diagnosis was wrong partway through, and correcting course (reverting) took priority over
  landing a fix based on a false premise.
- User confirmed reverting the erroneous `pipeline.ts` change rather than leaving it
  uncommitted for a future session to clean up.

## Open TODOs

1. **Decide the gate-status question** flagged in `migration/ConjugateCharts.md`'s "Test-
   harness bug fix" section: now that `conjugateChartParity.test.ts` shows real numbers
   (squat 0.0% / bench 0.7% / deadlift 0.4%) exactly matching `TotalChart`'s own accepted
   residual baseline, should this be formally promoted (treated as the same
   already-accepted approximation gap, clearing the way for Tasks 14-16), or does
   `APP_COMPONENTS.md`'s literal "exact match, not soft-warn" gate wording still block the
   swap since bench/deadlift are non-zero? This is a policy call for a maintainer, not
   something to resolve mechanically.
2. **Once decided**, either promote the relevant `conjugateChartParity.test.ts`/
   `variationRadarChartParity.test.ts` assertions from soft-warn `console.warn` to hard
   `expect`s (if promoting), or explicitly document further root-cause work needed to close
   the residual to exactly 0% (if not promoting).
3. **Resume Tasks 14-16** (`ConjugateCharts` swap, `VariationRadarChart` swap, `LiftTabPanel`
   wiring) only after TODO #1 is decided — issues #459/#460 still open.
4. **Commit the two currently-uncommitted changes** from this session
   (`conjugateChartParity.test.ts` fix + `migration/ConjugateCharts.md` update) — not yet
   committed as of this handoff; per repo convention, do this via a new commit (not
   amending), and per `CLAUDE.md`'s git rules, on this existing feature branch (do NOT
   create a new branch or commit to `main`).

## Files Touched

- `packages/app/src/pipeline/conjugateChartParity.test.ts` — `beforeAll` now builds
  `allSigmaPairs` (max-effort-only rows) and passes that to `buildSessionStats`, instead of
  the raw unfiltered `pairs` list. Fixes the test-harness bug identified last session.
- `migration/ConjugateCharts.md` — new "Test-harness bug fix (2026-07-08, follow-up)"
  section documenting root cause, fix, corrected numbers, full verification, and the open
  gate-status decision point.

Both changes are currently **uncommitted** (staged/unstaged in the working tree) — see Open
TODO #4 above.

## Suggested Next Skills

- No specific skill — next session should start by getting a maintainer decision on Open
  TODO #1 above (the gate-status question), then commit this session's two pending file
  changes (Open TODO #4) before resuming Tasks 14-16 work on issues #459/#460.
