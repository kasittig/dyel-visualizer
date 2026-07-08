# HANDOFF — Task list drafted for ConjugateCharts/VariationRadarChart pipeline swap

## Context (this session)

User asked how difficult it would be to swap `packages/app/src/components/charts/`
onto `@dyel/pipeline`'s `ChartPoint` struct. Scoping found `TotalChart`,
`DateLineChart`, `SessionBarChart` already migrated; `SigmaChart`/`BaseRadarChart`
are pipeline-fed or fully generic. `VariationRadarChart.tsx` is the one real holdout
(still calls `@dyel/core`'s `normalizeToBaseE1RM`), matching `MIGRATION_PLAN.md`
item #3 / issue [#460](https://github.com/kasittig/dyel-visualizer/issues/460), which
is hard-blocked on `ConjugateCharts` (item #2 / issue
[#459](https://github.com/kasittig/dyel-visualizer/issues/459)) landing first, plus a
last-session tooltip-detail sourcing gap. A full task list was written to
`TASK_LIST.md` (Phases A–D) to execute both swaps in dependency order. **No code was
changed this session — planning/docs only.**

## Context (prior sessions)

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` components off `@dyel/core` onto `@dyel/pipeline`. This file is now the sole
task-tracking reference (`SPECIFICATIONS.md` has been retired/deleted — its remaining-work
items are folded into "Open TODOs" below). The prior session (previous `HANDOFF.md`) closed
bench's flat 7.0% divergence via board/block/deficit canonical splitting (`dd01c17`).

This session was a documentation-correctness pass, not a code change: the standing docs
described core-vs-pipeline soft-warn divergence tiers as a "known, accepted divergence" —
i.e. a permanent policy of tolerating mismatch. The user corrected this: the actual goal is
full bit-for-bit legacy parity; soft-warn is only a temporary tracking mechanism while a
series's divergence is being root-caused. The docs also had two factual issues: GitHub issue
#451 was referenced as if still open (it's actually closed, merged via PR #454), and
`HANDOFF.md`'s Open TODO #2 speculated that pushPull's residual "may have been board-related"
and "likely includes bench" rather than stating the confirmed structural fact.

## Progress Overview

- **Corrected the soft-warn policy framing** across 5 living docs — reworded from "known,
  accepted divergence" (permanent tolerance) to "temporary tracking pending root-cause fix,
  promoted to hard-assert once resolved":
  - `packages/app/CLAUDE.md` — "Core-vs-pipeline parity testing" step 3 and the "Handling
    known divergence" paragraph.
  - `packages/app/src/testUtils/CLAUDE.md` — parity-harness pattern step 5 and live-diff-harness
    usage pattern point 4.
  - `migration/TotalChart.md` — Context section.
  - `HANDOFF.md` (this file, replacing the prior version) and `SPECIFICATIONS.md`'s "Currently
    open items" section.
- **Corrected #451's status**: confirmed via `gh issue view 451` that it's closed
  (`state: CLOSED`), merged via PR #454 ("Migrate TotalChart/ConjugateCharts to @dyel/pipeline
  with parity testing"), which fixed the chain-count/band-tension canonical-collapsing bug —
  a sibling bug to the board/block/deficit fix landed separately in `dd01c17`. Both are now
  cited in the docs as _landed precedents_ of the root-cause-then-promote-to-hard-assert
  pattern, not open items.
- **Confirmed pushPull's composite relationship as fact, not speculation**: verified from
  source that pushPull is mechanically `bench + deadlift` in both implementations —
  `packages/app/src/pipeline/totalChartSpecs.ts:16` (`composite('pushPull', ['bench',
'deadlift'])`) and legacy `packages/core/src/load/buildChartData.ts:63` (`point.pushPull =
Math.round(last.bench + last.deadlift)`). This means **squat's 0.7% divergence is the one
  standalone, truly independent unexplained gap** (it didn't move across addlWtOffset Design
  B/C, the board/block/deficit fix, or the #451/PR #454 chains/bands fix); pushPull's 0.3%
  residual is just the downstream sum of bench's and deadlift's own residuals and is expected
  to close automatically once those fully close.
- **Caught and reverted scope creep from the `feature-implementer` agent**: the agent's
  otherwise-correct edit also added an unrelated note about test-count drift from a separate
  commit (`c180add`) into `HANDOFF.md`, `SPECIFICATIONS.md`, and `FIX_BOARD_COUNT.md` — not
  part of the requested task. Caught via independent `qa-reviewer` verification (which flagged
  a 6th modified file where only 5 were expected), then manually reverted: `FIX_BOARD_COUNT.md`
  restored via `git checkout`, and the extra notes stripped from `HANDOFF.md`/`SPECIFICATIONS.md`
  while keeping the correctly-scoped wording fixes. Also caught and fixed one leftover hedge
  (`HANDOFF.md`'s "Suggested Next Skills" bullet) that the agent's pass had missed.
- **Final verification**: `git status --short` confirms exactly 5 files modified
  (`packages/app/CLAUDE.md`, `packages/app/src/testUtils/CLAUDE.md`, `migration/TotalChart.md`,
  `HANDOFF.md`, `SPECIFICATIONS.md`); `git diff -- '*.ts'` is empty (no code/test changes);
  sanity greps for the old stale phrasing return no matches.

## Decisions Made & Rationale

- **Soft-warn reframed as interim, not permanent** — matches the user's explicit correction
  that the project's goal is full bit-for-bit parity, not accepted tolerance of legacy/pipeline
  mismatch. Every soft-warn series should be traceable to an open root-cause investigation (or
  a filed issue) and eventually promoted to hard-assert, mirroring how bench/pushPull/total
  were promoted after `dd01c17`.
- **Historical narrative sections left untouched** — `HANDOFF.md`'s and `SPECIFICATIONS.md`'s
  point-in-time task logs, before/after tables, and root-cause writeups describe what was true
  when written and were deliberately not rewritten; only the living "Open TODOs"/"Currently
  open items" trackers were corrected, to avoid falsifying the historical record.
- **Reverted scope creep rather than keeping "extra but accurate" content** — even though the
  agent's `c180add` test-count note was likely factually correct, it was unrequested and
  outside the approved plan's file list. Team-lead discipline: keep changes scoped to what was
  reviewed and approved; a stray but true fact doesn't justify expanding scope without a
  separate, explicit task.

## Open TODOs

0. **Execute `TASK_LIST.md`** (this session's output) — Phase A (swap `ConjugateCharts`
   onto `@dyel/pipeline`, issue #459), Phase B (source last-session tooltip detail from
   the pipeline), Phase C (swap `VariationRadarChart.tsx` itself, issue #460), Phase D
   (docs cleanup). See that file for full task breakdown, targets, and test commands.
1. **File a GitHub tracking issue for squat's 0.7% divergence** — now documented as the one
   standalone, unexplained parity gap with no tracking issue filed. Natural next step given
   the corrected "soft-warn is interim, not accepted" policy. Confirmed unrelated to
   equipment-magnitude collapsing (`dd01c17`), addlWt correction (Design C), or the
   chain-count/band-tension fix (`#451`/`PR #454`), all of which had measurable effects on
   other series but left squat unchanged throughout. Not investigated further.
2. ~~**Task 10 (final closeout QA) for the bench/board fix**~~ — **executed 2026-07-08**, not
   just nominal: this TODO was stale. Re-ran fresh via `qa-reviewer` against the current
   working tree (including the uncommitted `MIN_SAMPLES=1→3` fix): both builds green, pipeline
   12 files/124 tests, app 19 files/187 tests, all passing. Parity numbers
   (`totalChartParity`/`sigmaTabParity`) match the documented post-fix state exactly — squat
   16.2% (unaffected), bench 14.7%, deadlift 8.4% (confirms the deadlift regression fix
   holds), pushPull 10.5%, total 9.5%. No regressions, no discrepancies.
3. **ConjugateCharts Task 8**: swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto
   `@dyel/pipeline`, using `conjugateChartSpecs()` (with `groupBy: 'label'`) and the now-fixed
   normalization model — still not started, still on `@dyel/core` at runtime. Per-variation
   soft-warns should stay **not** promoted to hard-assert (n=1-5 samples, too sparse). (Target:
   `packages/app/src/components/pages/ConjugateCharts.tsx` (or wherever it now lives),
   `packages/app/src/hooks/useConjugateChartData.ts`. Test: `npm test -w packages/app --
conjugateChartParity` plus full `npm test -w packages/app`) Tracked:
   [#459](https://github.com/kasittig/dyel-visualizer/issues/459).
4. Once ConjugateCharts is swapped (or deferred further), `MIGRATION_PLAN.md` Phase 4's other
   two blockers still need the same treatment: `VariationRadarChart`
   ([#460](https://github.com/kasittig/dyel-visualizer/issues/460)) and `DiagnosticsPanel`
   ([#461](https://github.com/kasittig/dyel-visualizer/issues/461)).
5. **Narrower baseline-pooling scope for deadlift's residual divergence** — a prior attempt to
   pool every non-addlWt canonical across the whole lift family (mirroring legacy's
   `buildStraightByFamily`) improved deadlift (8.4%→6.5%) and total (9.5%→7.7%) but regressed
   squat (0.7%→2.3%), bench (14.7%→21.5%), and pushPull (10.5%→11.3%) — reverted 2026-07-08
   (`normalize.ts`/`normalize.test.ts` restored to pre-change state, verified 0-line diff vs.
   `HEAD`). Hypothesis (not yet investigated): pooling the _entire_ family introduces
   noisier interpolation anchors for series with mechanically heterogeneous sibling variants
   (bench, squat, pushPull) vs. deadlift's more similar stance siblings. A narrower pooling
   scope (e.g. limited to mechanically-similar siblings rather than the full family) might
   capture deadlift's gain without the other regressions. Not attempted this session. (Target:
   `packages/pipeline/src/derive/normalize.ts`. Test: `npm test -w packages/app --
totalChartParity`)
6. **PushPull's residual** — currently ~10.5% (post `MIN_SAMPLES=1→3` fix). Confirmed (not
   speculated) to be downstream of bench and deadlift's own residuals via
   `composite('pushPull', ['bench', 'deadlift'])` in `totalChartSpecs.ts` (same in both legacy
   and pipeline implementations). Expected to close automatically once bench and deadlift
   fully close rather than requiring separate root-cause investigation.

## Files Touched

- `TASK_LIST.md` (new — Phases A–D task breakdown for the ConjugateCharts/
  VariationRadarChart pipeline swap)
- `HANDOFF.md` (this file — new Context subsection + Open TODO #0 added, pointing to
  `TASK_LIST.md`)
- `packages/app/CLAUDE.md` (parity-policy wording, prior session)
- `packages/app/src/testUtils/CLAUDE.md` (parity-policy wording, prior session)
- `migration/TotalChart.md` (Context section wording, prior session)
- `SPECIFICATIONS.md` (deleted, prior session — remaining-work items folded into this
  file's Open TODOs)

## Suggested Next Skills

- Start executing `TASK_LIST.md` Phase A (Task 1: swap `useConjugateChartData.ts` onto
  `runPipeline` + `conjugateChartSpecs`) — delegate to `feature-implementer`, then
  `qa-reviewer` for Task 2.
- File a new GitHub issue for squat's 0.7% divergence (Open TODO #1) before starting any new
  investigation work on it — independent of the task list above, can happen any time.
