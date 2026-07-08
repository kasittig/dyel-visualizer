# VOLUME_FILTER_DESIGN — design options for the volume/speed-work filtering gap

Status: **draft, awaiting sign-off** — no implementation yet. Nothing in this file has
been coded against; see `HANDOFF.md` Open TODO #1 and `LEGACY_MIGRATION.md`'s
"Follow-up" section for how this gap was found.

## Problem recap

Legacy (`packages/app/src/utils/appDataUtils.ts:23-38`, `splitByEffort`) excludes a
session from the normalization-model fit unless `session.sets === 1 ||
session.rpe !== null` — i.e. it only fits on "max-effort" sessions, dropping
volume/speed-work (e.g. `5x5` with no RPE). `@dyel/pipeline`'s
`fitNormalizationModel` (`packages/pipeline/src/derive/normalize.ts`) has no
equivalent concept and fits on the entire tagged history. This asymmetry is now the
best-evidenced explanation for the persistent 16-25% `maxRelDiff` on
squat/bench/deadlift/total in `totalChartParity.test.ts`/`sigmaTabParity.test.ts`
(confirmed via direct model diff — see `LEGACY_MIGRATION.md`, squat's `Box Squat`
variant: `sampleCount=2` legacy vs `n=3` pipeline from the same fixture).

## Why this isn't a mechanical port

Investigated whether legacy's `sets === 1 || rpe !== null` check can be reconstructed
from data already available on `TaggedSetRecord`. It cannot, uniformly:

| Source                                                        | `sets` availability                                                                                                                                       | Verdict         |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `@dyel/core`'s `TrainingSession`                              | Real field (`packages/core/src/types/conjugate.ts:98-106`), parsed per-row, **defaults to 1** when the CSV `sets` column is absent (`parseSession.ts:18`) | source of truth |
| `@dyel/pipeline` CSV parser                                   | Captured opportunistically into `meta.sets` (string) only when a `sets` column exists (`csv.ts:~93-99`) — **no default-to-1 fallback**                    | partial         |
| `@dyel/pipeline` freeform parser                              | **No `sets` concept at all** — one `SetRecord` per weight token, not per logged "N sets of M reps" line (`freeform/tokenizer.ts`, `parser.ts:69-84`)      | absent          |
| `@dyel/pipeline` grouping-derived (count same date+canonical) | Measures something different (distinct logged entries that day), not "sets in this one row"                                                               | not equivalent  |

Also: `rpe` itself has a validation gap independent of this issue — legacy nulls out
out-of-range RPE (`parseSessionFields.ts:16-18`, must be in `[1,10]`); pipeline's CSV
parser (`csv.ts:~88`) does not range-check, so a garbage RPE value could pass the
`rpe !== null` gate today where legacy would not. Flagging this so it doesn't get
silently folded into whichever option is picked — it needs its own decision either way.

**Conclusion:** any fix has to pick a policy for (a) CSV rows with a `sets` column
(reconstructable, module the missing default), and separately (b) freeform-sourced
rows and CSV rows with no `sets` column (fundamentally not reconstructable without a
parser change). No option below avoids making that call.

## Options

### Option A — Add `sets` as a first-class `SetRecord` field, port the full heuristic

Add `sets?: number` to `SetRecord` (`packages/pipeline/src/types.ts`). Populate it in
the CSV parser (already has the raw value, just promote `meta.sets` → typed field with
legacy's default-to-1 fallback). Add a `<sets>x<reps>` grammar to the freeform
tokenizer/parser to close the freeform gap for real, matching legacy's
`textLineToRow.ts` grammar. Add RPE range validation to the CSV parser to close the
secondary gap. Then either (a1) tag max-effort/volume at `tag/` time
(`effort:max`/`effort:volume`, computed in `buildTagsAndEffects`) and filter via
`TagQuery` before the fit, or (a2) filter inline in `pipeline.ts` just before the
`fitNormalizationModel` call using the new `sets`/`rpe` fields directly.

- **Pros:** Closes the gap for all three input sources (CSV-with-sets-column,
  CSV-without, freeform) with the same fidelity as legacy. `sets` becomes a real,
  reusable pipeline concept, not a one-off filter hack. Fixes the RPE validation gap
  too.
- **Cons:** Largest surface area — touches `types.ts` (a currently "logic-free" file
  per `packages/pipeline/CLAUDE.md`), both parsers, and either `tag/` or `pipeline.ts`.
  Freeform grammar work is nontrivial (new tokenizer syntax, new tests, ambiguity risk
  with existing pyramid-set syntax `"225x3, 235x1"`). Highest risk of scope creep for
  what started as a parity-gap fix.

### Option B — Pre-filter inline in `pipeline.ts`, CSV-only, `sets`-column-present only

Add a `sets?: number` field to `SetRecord`, populated only where the CSV parser
already has the raw value (promote existing `meta.sets` capture, keep legacy's
default-to-1 fallback for missing-column rows). Do **not** touch the freeform parser.
In `pipeline.ts`, before the `fitNormalizationModel` call, filter `tagged` to
`sets === 1 || rpe !== undefined` for the fit input only (mirrors how `ui.dateRange`
already scopes rendered points post-fit, never the fit itself — same shape of change,
inverse timing). Freeform-sourced and no-`sets`-column CSV rows are treated as
**unfiltered/included** (documented gap, not silently "fixed").

- **Pros:** Much smaller diff — one field, one parser touched, one filter site.
  Directly closes the gap for the CSV-with-sets-column case, which is plausibly the
  majority of real fixture/sheet data (worth confirming against actual fixtures before
  committing to this option). No `tag/` module changes, no freeform grammar risk.
- **Cons:** Explicitly leaves freeform inputs and sets-column-less CSVs unfixed —
  gap only partially closed, and the residual will look like unexplained noise in
  parity tests unless clearly documented. Reintroduces an asymmetry between
  CSV-sourced and freeform-sourced data quality that doesn't exist today (today both
  are equally "wrong" in the same direction; this makes CSV strictly better).

### Option C — Accept and document; do not port the filter

Treat pipeline's "fit on entire tagged history" as the intentional, more
statistically-sound design (more samples per canonical, no arbitrary volume/max-effort
split) and instead: downgrade or retire the affected `totalChartParity`/
`sigmaTabParity` soft-warns' framing from "bug to fix" to "known, accepted
divergence" (same tier `packages/app/CLAUDE.md` already uses for the squat/pushPull
residuals), update `GAPS_REMAINING.md` §0c/0d/0e to reflect this as a closed
investigation with a documented rationale, not an open gap.

- **Pros:** Zero implementation risk, zero new parser/type surface. Consistent with
  the project's stated preference (`MIGRATION_PLAN.md`) that pipeline is the
  target end-state — arguably legacy's heuristic is the thing that's "wrong," not
  pipeline's omission of it.
  Fastest to close out this investigation thread.
- **Cons:** Leaves the 16-25% `maxRelDiff` in place indefinitely — a genuinely large
  number for a "soft-warn, not yet promoted to hard-assert" tier per
  `packages/app/CLAUDE.md`'s stated goal of eventually promoting these to hard
  assertions. Effectively means squat/bench/deadlift/total never reach that bar unless
  a future session revisits this. Requires explicit user buy-in that this magnitude of
  divergence is acceptable to live with permanently, not just deferred.

### Option D — Hybrid: Option B now, Option A's freeform grammar as a separate follow-up

Land Option B first (small, closes the CSV-with-sets-column case, which the
`totalChartParity`/`sigmaTabParity` fixtures likely exercise directly — worth
confirming). File a separate tracking issue/task for the freeform `<sets>x<reps>`
grammar (Option A's harder half) as explicitly deferred work, not silently dropped.
Re-run `maxRelDiff` after Option B lands to see how much of the gap it actually closes
before deciding whether the freeform grammar work is worth the effort.

- **Pros:** Sequences the low-risk, likely-high-value part first and gets real
  numbers before committing to the freeform grammar's larger scope. Avoids Option C's
  risk of accepting a gap that a small change could have mostly closed. Avoids Option
  A's risk of over-building freeform support before confirming it's the fixture's
  actual bottleneck.
- **Cons:** Two-phase — doesn't fully close the gap in one pass, and requires a second
  sign-off/measurement cycle. If it turns out the fixture data is freeform-sourced (not
  CSV), Option B alone won't move the numbers, and the "measure first" step just adds a
  round-trip before landing on Option A anyway.

## Recommendation

**Option D.** Reasoning: Option B's cost is nearly the same as "just add the field and
filter," giving real measured feedback on how much of the 16-25% gap is
CSV-sets-column-driven before investing in freeform grammar work (Option A's expensive
half) or accepting the residual as permanent (Option C). This also respects the
project's own "verify before documenting done" convention — Option C's rationale ("more
samples is more sound") is plausible but unverified; measuring after Option B lands
gives an evidence-based answer either way. Before implementing, need explicit
confirmation of:

1. Which option (A/B/C/D) to proceed with.
2. If B or D: whether the RPE range-validation gap (noted above) should be fixed in the
   same pass or filed as a separate, explicitly out-of-scope follow-up.
3. ~~If B or D: confirm whether `test/fixtures/total-chart-sheet.csv` (the fixture
   driving the parity tests) actually has a `sets` column~~ — **confirmed**:
   `total-chart-sheet.csv`'s header is `Date,Exercise,Sets,Reps,Weight (lbs),RPE`
   (e.g. row `2/6/2026,Box Squat,5,5,115,` — the exact 5x5 row named in
   `LEGACY_MIGRATION.md`'s root-cause trace has `Sets=5`, `RPE` blank). So Option B/D's
   CSV-only fix directly touches this fixture and should move the reported
   `maxRelDiff` numbers — not a dead end.

## Not addressed by this doc

- Implementation detail of tag-based (a1) vs. inline (a2) filtering under Option A —
  deferred until an option is chosen.
- `GAPS_REMAINING.md` §0c/0d/0e re-scoping — blocked on this decision, tracked as
  `HANDOFF.md` Open TODO #2.
- Filing the GitHub tracking issue — tracked as `HANDOFF.md` Open TODO #4, blocked on
  a direction being picked here.
