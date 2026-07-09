# HANDOFF

## Context

`migration-phase-1` implements `MIGRATION_PLAN.md`'s pipeline-native migration of
`packages/app` off `@dyel/core` onto `@dyel/pipeline`. This session picked up Task 13
(`DiagnosticsPanel.tsx`), previously blocked on GitHub issue #461, and closed it end-to-end:
pipeline-side gap work, the component swap, hard-assert parity promotion, and doc updates.
Full plan lives at `/Users/kasittig/.claude/plans/stateful-launching-parnas.md`.

## Progress Overview

**Task 13 / issue #461 is complete and verified** (144 pipeline tests / 236 app tests / 321
core tests all green, both `packages/pipeline` and `packages/app` builds clean):

- **Scope correction:** fresh exploration found #461's original description was stale — most
  described gaps (canonical→display-name resolution, percentage-baseline-range model,
  range-based status classification, context-based `usePipelineDiagnostics()`) were already
  implemented in a prior session. The one genuine gap: `addlWtOffset` wasn't surfaced by
  `diagnose()`.
- **Pipeline-side (`packages/pipeline/src/analyze/diagnose.ts`):** added `addlWtOffset?: {
offsetLbs: number; n: number }` to `VariantAssessment` (kg→lbs converted from
  `NormalizationModel.addlWtOffset`, only when `n > 0`). `packages/pipeline/src/pipeline.ts`'s
  `runPipeline`/`runPipelineModel` gained an optional `now?: number` param for deterministic
  testing (defaults to `Date.now()`).
- **New `'stale'` status (mid-session addendum, user-requested):** promoting
  `diagnosticsPanelParity.test.ts` to hard-assert surfaced a real, root-caused divergence —
  pipeline's `diagnose()` has an intentional `staleDays` gate (90 days) that legacy
  `generateDiagnostics` never had; a variant whose only session was 93 days old was silently
  dropped into `unassessed` by pipeline but stayed `optimal` forever in legacy. Decision
  (confirmed with user): keep the staleness gate, but surface it as a first-class `'stale'`
  status (`VariantAssessment['status']` is now `'optimal' | 'weakness' | 'overperforming' |
'stale'`) instead of silently excluding the variant. `unassessed` is now narrower — only
  for canonicals with no `lift:` tag, no fitted `variantFactor`, or no baseline-lift latest
  point. Stale variants still compute `ratio`/`averageIndex`/`expectedBaseline` normally and
  are excluded from weakness-vote tallying.
- **App-side:** `usePipelineDiagnostics.ts` extended to pass through `displayName`/
  `averageIndex`/`expectedBaseline`/`addlWtOffset`/the 4-way status (previously silently
  dropped these fields). `DiagnosticsPanel.tsx` fully swapped off `generateDiagnostics`
  (`@dyel/core`) onto `usePipelineDiagnostics()` — renders `'stale'` with `var(--muted)`/
  "Stale" label (no new CSS var needed, `--muted` already has light/dark values in
  `index.css`); `addlWtOffset` renders as a signed number only (`+12.3lbs`), no equipment-
  label prefix (pipeline has no raw-equipment-tag list to build one from). `LiftTabPanel.tsx`'s
  `<DiagnosticsPanel />` call site narrowly trimmed (`rows`/`targetName`/`variantFactor`/
  `addlWtOffset` dropped; UI-state props kept) — nothing else in that file touched, it's still
  blocked on `ConjugateCharts`/`VariationRadarChart` (#459/#460) for its own full migration.
- **Parity test promoted:** `diagnosticsPanelParity.test.ts` moved from soft-warn to
  hard-assert — fixed-anchor `now` (deterministic, no more wall-clock dependency), per-variant
  `it.each` status equivalence (6/6 pass, `'overperforming'`↔`'overtrained'` mapping
  confirmed correct), stale variants explicitly excluded from that equivalence check (with a
  comment explaining why) plus a separate un-skipped assertion proving the stale variant is
  tagged correctly rather than lost. Zero `it.skip`/soft-warn-and-pass masking remains.
- **Docs:** `MIGRATION_PLAN.md`/`APP_COMPONENTS.md` updated to reflect `DiagnosticsPanel` as
  complete (renumbered remaining items to `ConjugateCharts`(1)/`VariationRadarChart`(2)/
  `LiftTabPanel`(3)); `migration/DiagnosticsPanel.md` deleted (matches
  `RepCalculator`/`StrengthScoreCalculator` precedent); `packages/app/CLAUDE.md` and
  `components/shared/CLAUDE.md`'s `DiagnosticsPanel.tsx` descriptions updated;
  `packages/pipeline/src/analyze/CLAUDE.md`'s contract doc fixed twice (once for pre-existing
  drift on `displayNameByCanonical`/`baselineRangeByCanonical` params, once for the new
  `addlWtOffset`/`'stale'` additions).

## Decisions Made & Rationale

- **Two scope decisions confirmed with user (both "Option A" — accept smaller scope, document
  residuals, same pattern as prior `RepCalculator`/`StrengthScoreCalculator` migrations):**
  1. `DiagnosticsPanel` now shows all-time diagnostics, not date-range-filtered — pipeline's
     shared `PipelineModel` has no date-range parameter (`diagnose()` runs once over full
     history, unlike per-view `buildDataset`). Accepted, documented behavior change.
  2. Dropped the add'l-weight equipment-label prefix (e.g. "Chains + Bands: +12.3lbs" →
     "+12.3lbs") — pipeline's `VariantAssessment` has no raw-equipment-tag list to build a
     label from. Follow-up filed only if the label is wanted later (not filed this session).
- **`'stale'` status addition (third decision, mid-session):** rather than either forcing the
  hard-assert to fail/skip on the staleness divergence, or reverting pipeline's staleness gate
  to match legacy's total absence of one, the user asked to surface staleness as a real
  diagnosis. This is treated as a product improvement (don't present 90+-day-old data as a
  current diagnosis) rather than a bug — confirmed narrow/architectural via root-cause
  investigation (both implementations' `MIN_SAMPLES` thresholds already matched at 1; this was
  purely legacy having no staleness concept at all).
- **Status vocabulary:** `DiagnosticsPanel.tsx` renamed its internal comparisons from legacy's
  `'overtrained'` to pipeline's `'overperforming'` (single source of truth on pipeline's enum,
  no translation layer) — but kept the user-facing label text "Overtrained" as cosmetic copy,
  since that's a product/copy decision, not a technical one.
- **No dedicated `DiagnosticsPanel.test.tsx` was created** — the component had none before this
  session either; coverage comes from `usePipelineDiagnostics.test.ts` (hook-level) plus the
  parity test (end-to-end pipeline output). Not flagged as a gap, matches pre-existing
  convention for this component.
- **Git commit policy:** per this session's convention (carried from prior sessions), all
  subagents were instructed not to commit. Everything below is uncommitted in the working tree
  as of this handoff, EXCEPT the commit made by this `/handoff` skill run itself (see below).

## Open TODOs

1. **Resume Tasks 14-16 as their blockers close** — issues #459 (`ConjugateCharts`) and #460
   (`VariationRadarChart`) are still OPEN as of this session (re-checked via `gh issue view`).
   `LiftTabPanel.tsx`'s full migration (`filterByDateRange` removal, `Task 16`) is blocked on
   both. No new scoping needed — `MIGRATION_PLAN.md` items 1-2 have full detail once unblocked.
2. Nothing else from Task 13 is outstanding — issue #461 is fully closed, all 8 plan steps (plus
   the mid-session `'stale'`-status addendum) verified green.
3. Same open item carried from the prior session: consider whether to organize this session's
   changes into more granular commits vs. one commit covering all of it (this handoff makes one
   commit, per the established pattern) — not yet asked.

## Files Touched

**Pipeline package:**

- `packages/pipeline/src/analyze/diagnose.ts` — added `addlWtOffset` field, added `'stale'`
  status, narrowed `unassessed` semantics
- `packages/pipeline/src/analyze/diagnose.test.ts` — new coverage for both additions
- `packages/pipeline/src/analyze/CLAUDE.md` — contract doc fixed (params + new status/field)
- `packages/pipeline/src/pipeline.ts` — `runPipelineModel`/`runPipeline` gained optional `now?`
- `packages/pipeline/src/pipeline.test.ts` — updated for the new param

**App package:**

- `packages/app/src/hooks/pipeline/usePipelineDiagnostics.ts` — extended `DiagnosticVariant`
- `packages/app/src/hooks/pipeline/usePipelineDiagnostics.test.ts` — new test file
- `packages/app/src/components/shared/DiagnosticsPanel.tsx` — swapped onto pipeline-native path
- `packages/app/src/components/pages/LiftTabPanel.tsx` — trimmed `<DiagnosticsPanel />` props
- `packages/app/src/pipeline/diagnosticsPanelParity.test.ts` — promoted to hard-assert
- `packages/app/CLAUDE.md`, `packages/app/src/components/shared/CLAUDE.md` — description fixes

**Docs:**

- `MIGRATION_PLAN.md`, `APP_COMPONENTS.md` — `DiagnosticsPanel` marked complete, renumbered
- `migration/DiagnosticsPanel.md` — deleted (fully completed)

**Also present in working tree, not touched this session** (pre-existing, listed for
completeness): `.claude/agents/feature-implementer.md`, `.claude/agents/team-lead.md`,
`.claude/skills/handoff/SKILL.md`, deleted `SPECIFICATIONS.md`, `migration/LiftTabPanel.md`,
`package-lock.json`, untracked `.agents/`, `.codex/`, `AGENTS.md`, stray output-redirect files
(`build-output.txt`, `test-output.txt`, `packages/app/test_output.txt`).

## Suggested Next Skills

- No specific skill needed — next session should check issues #459/#460 for status (both open
  as of 2026-07-08), and if either has closed, resume the corresponding blocked task
  (`ConjugateCharts` or `VariationRadarChart`) using `MIGRATION_PLAN.md`'s items 1/2, which
  already have full swap instructions and blocker context.
