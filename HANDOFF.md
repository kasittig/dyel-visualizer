# HANDOFF — Corrected parity-policy docs (soft-warn is interim, not accepted; #451 closed; pushPull/bench composite confirmed)

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` components off `@dyel/core` onto `@dyel/pipeline`. Full task tracking lives in
`SPECIFICATIONS.md`. The prior session (previous `HANDOFF.md`) closed bench's flat 7.0%
divergence via board/block/deficit canonical splitting (`dd01c17`).

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

1. **File a GitHub tracking issue for squat's 0.7% divergence** — now documented as the one
   standalone, unexplained parity gap with no tracking issue filed. Natural next step given
   the corrected "soft-warn is interim, not accepted" policy.
2. **Task 10 (final closeout QA) for the bench/board fix** — still nominally queued per the
   prior session's plan (every individual task was independently verified as it landed; this
   is a formality re-run, not yet executed).
3. **ConjugateCharts Task 8**: swap `ConjugateCharts.tsx`/`useConjugateChartData.ts` onto
   `@dyel/pipeline` — still not started, still on `@dyel/core` at runtime. Per-variation
   soft-warns remain not promoted to hard-assert (n=1-5 samples, too sparse).
4. Once ConjugateCharts is swapped (or deferred further), `MIGRATION_PLAN.md` Phase 4's other
   two blockers (`VariationRadarChart`, `DiagnosticsPanel`) still need the same treatment.

## Files Touched

- `packages/app/CLAUDE.md` (parity-policy wording)
- `packages/app/src/testUtils/CLAUDE.md` (parity-policy wording)
- `migration/TotalChart.md` (Context section wording)
- `HANDOFF.md` (this file — Open TODOs corrected, then fully rewritten for this handoff)
- `SPECIFICATIONS.md` ("Currently open items" section — squat/pushPull items added)

## Suggested Next Skills

- File a new GitHub issue for squat's 0.7% divergence (Open TODO #1) before starting any new
  investigation work on it.
- If picking up implementation work next, ConjugateCharts Task 8 (Open TODO #3) is the largest
  remaining piece of `MIGRATION_PLAN.md` Phase 4.
