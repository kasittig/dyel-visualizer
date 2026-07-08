# Fix plan: bench's flat 7.0% divergence — equipment-magnitude canonical collapsing

Status: **✅ COMPLETE (10/10 tasks, 2026-07-07).** Fix implemented, verified at every step,
and independently confirmed via a final closeout QA pass.

See `SPECIFICATIONS.md` ("Fixing bench's flat 7.0% divergence" section) for the
tracked-in-context version of this plan and `HANDOFF.md` for session history. This file is a
standalone copy of the same plan for focused reference.

## Root cause (verified via direct code trace + fixture correlation)

Bench's flat ~7.0% divergence between legacy (`@dyel/core`) and pipeline (`@dyel/pipeline`)
`TotalChart`/`ConjugateCharts` output was **not** related to Design C's `addlWtOffset`
weight-space correction — bench's addlWt (chain) canonicals already got their offsets fit and
applied correctly. It was a separate, additive bug:

- `EQUIPMENT_DETECTORS`'s `board` entry (`packages/pipeline/src/tag/detect/detectors.ts:42`)
  matches any string containing `"board"` and discards the count, so `Bench (1 board)` and
  `Bench (2 board)` both resolved to a single canonical (`bench-board`).
- `fitNormalizationModel` (`packages/pipeline/src/derive/normalize.ts`) fits **one blended
  `variantFactor`** per canonical (`Object.groupBy(history, r => r.canonical)`), so
  `bench-board`'s factor was a single blend across mixed 1-board and 2-board sessions.
- Legacy's `buildSessionStats` (`packages/core/src/utils/stats/sessionIndex.ts:51,55`) groups
  by the exact `displayName` string, so `Bench (1 board)` and `Bench (2 board)` get
  **independent** `fitVariantFactor` calls (`sessionIndex.ts:112`) — never blended.

**Evidence:** a throwaway debug harness (deleted after use, working tree confirmed clean)
diffed legacy vs. pipeline bench output per date on `total-chart-sheet.csv`. The three
worst-diverging dates (7.04%, 2.33%, 1.91% — next-worst is 0.67%) are exactly the fixture's
three board-press session dates. This corroborates `migration/ConjugateCharts.md`'s Finding
#6, which noted `bench-board` pooling `Bench (1 board)`/`Bench (2 board)` but dismissed it as
insufficient to explain the _whole_ composite gap — correct for the aggregate gap (addlWt/
Design B/C explained most of it), but it was the near-total explanation for bench's _residual_
post-Design-C 7.0%.

## Task 1 findings (2026-07-07) — scope generalized to board + block + deficit

A `feature-implementer` audit (research only, no code change) examined all 9
`EQUIPMENT_DETECTORS` entries against real exercise strings in `packages/app/test/fixtures/
*.csv` and `packages/pipeline/test/fixtures/*.csv`:

| Equipment                                             | Detector pattern                        | Fixture evidence                              | Active divergence?             | In scope?             |
| ----------------------------------------------------- | --------------------------------------- | --------------------------------------------- | ------------------------------ | --------------------- |
| `board`                                               | `.includes('board')`, discards count    | `Bench (1 board)`, `Bench (2 board)` (mixed)  | **Yes — confirmed root cause** | Yes                   |
| `block`                                               | `.includes('block')`, discards height   | `Deadlift (2" block)` (5x, all same height)   | No (latent only)               | **Yes — generalized** |
| `deficit`                                             | `.includes('deficit')`, discards height | `Deadlift (2" deficit)` (4x, all same height) | No (latent only)               | **Yes — generalized** |
| `box`, `incline`, `decline`, `pause`, `floor`, `rack` | substring match                         | no numeric variants found in fixtures         | No                             | No — out of scope     |

`block` and `deficit` share `board`'s exact bug shape (substring match discarding a numeric
magnitude qualifier) and use the identical `EQUIPMENT_DETECTORS` mechanism. Fixture data
happened to have only one height logged per modifier (no active divergence), but this was a
latent bug — any future session logging a different block/deficit height would have triggered
the same blending problem. Since the fix mechanism, code location, and cost are identical
across all three, **the fix scope was generalized to board + block + deficit**.
`box`/`incline`/`decline`/`pause`/`floor`/`rack` were excluded — no numeric variants observed
in either fixture set, so no evidence of need; can be revisited later if real usage surfaces
the same pattern.

## Chosen fix design

**Structural canonical fix**, preferred over the alternative of mirroring `groupBy: 'label'`
into the `variantFactor` fit step (that alternative would be more invasive to
`NormalizationModel`'s canonical-keyed shape, documented in `packages/pipeline/src/derive/
CLAUDE.md`, and would need explicit design sign-off the way Designs B/C did — not chosen).

Extended board/block/deficit detection to capture the numeric magnitude and thread it into the
canonical, mirroring the existing `addlWts` magnitude pattern already in the codebase: chains
parses a digit or `"double"` → magnitude, defaults to `"1"`, and omits the magnitude suffix
from the canonical string when it's `"1"` (see `canonical.ts:49` and its `canonical.test.ts`
matrix). Canonicals now split (`bench-board` for 1-board — unchanged, `bench-board-2` for
2-board — new; `deadlift-blocks`/`deadlift-blocks-2`; `deadlift-deficit`/
`deadlift-deficit-2`), so `fitNormalizationModel`'s existing per-canonical grouping
automatically fits them separately. **No changes were needed in `derive/` or `pipeline.ts`** —
the fix is fully contained to the `tag/detect/` layer, as planned.

## Implementation summary (all steps independently `qa-reviewer`-verified)

- **Task 2:** Added `equipmentMagnitude: string | null` to `ParsedExercise`
  (`packages/pipeline/src/tag/detect/conjugate-types.ts`).
- **Task 3:** Implemented magnitude parsing in `parseExercise.ts`: digit or `"double"` before
  `"board"`; digit (optionally followed by `"`) before `"block"`/`"blocks"` or `"deficit"`;
  default `"1"`. Populated only for `board`/`block`/`deficit` equipment.
- **Task 4:** Wired `equipmentMagnitude` into `buildCanonical`
  (`packages/pipeline/src/tag/detect/canonical.ts`) — appends `-${magnitude}` when non-default.
  Confirmed `buildTagsAndEffects` stays keyed by equipment kind only, unaffected.
- **Task 5:** Extended `canonical.test.ts`'s magnitude `it.each` matrix with 9 new rows
  (pipeline test count 207 → 216).
- **Task 6:** Documented the convention in `packages/pipeline/src/tag/CLAUDE.md`.

## Real before/after numbers (Task 7, re-confirmed byte-for-byte at Task 10 closeout)

| Series   | Before (post Design C) | After (this fix) | Change                                                                                           |
| -------- | ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| squat    | 0.7%                   | **0.7%**         | unchanged (no equipment-magnitude variants)                                                      |
| bench    | 7.0%                   | **0.7%**         | **~10x improvement — confirms root cause**                                                       |
| deadlift | 0.6%                   | **0.6%**         | unchanged (fixture's block/deficit heights are uniform — latent bug closed, not observable here) |
| pushPull | 2.5%                   | **0.3%**         | **~8x improvement — downstream ripple**                                                          |
| total    | 1.8%                   | **0.2%**         | **~9x improvement — downstream ripple**                                                          |

`conjugateChartParity.test.ts` normalized composites: bench 7.0%→**0.7%** (same improvement),
squat/deadlift unchanged. All hard-assert tests remained green throughout; no tolerances were
loosened — these are genuine measured improvements on the existing soft-warn series.

Verbatim console output (`totalChartParity.test.ts`):

```
core-vs-pipeline squat: compared=13 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.7%
core-vs-pipeline bench: compared=22 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.7%
core-vs-pipeline deadlift: compared=19 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.6%
core-vs-pipeline pushPull: compared=40 missingInA=0 missingInB=6 maxAbsDiff=1 maxRelDiff=0.3%
core-vs-pipeline total: compared=46 missingInA=0 missingInB=0 maxAbsDiff=1 maxRelDiff=0.2%
```

## Task list (ordered)

- [x] Task 1: Audit `BAR_DETECTORS`/`STANCE_DETECTORS`/`EQUIPMENT_DETECTORS` (`detectors.ts`)
      against real fixture data (`packages/app/test/fixtures/*.csv`, `packages/pipeline/
    test/fixtures/*.csv`) for other magnitude-bearing modifiers that collapse the same way
      board does. **Result: scope generalized to board + block + deficit** (see findings
      above). (Target: `packages/pipeline/src/tag/detect/detectors.ts`; Test: n/a — written
      findings)
- [x] Task 2: Added `equipmentMagnitude: string | null` to `ParsedExercise`. (Target:
      `packages/pipeline/src/tag/detect/conjugate-types.ts`)
- [x] Task 3: Extended board/block/deficit detection to parse magnitude, wired into
      `parseExercise`. (Target: `packages/pipeline/src/tag/detect/detectors.ts`,
      `packages/pipeline/src/tag/detect/parseExercise.ts`)
- [x] Task 4: Updated `buildCanonical` to append `equipmentMagnitude` to the canonical string
      when non-default; confirmed `buildTagsAndEffects` unaffected. (Target:
      `packages/pipeline/src/tag/detect/canonical.ts`)
- [x] Task 5: Extended `canonical.test.ts`'s magnitude `it.each` matrix with board/block/
      deficit cases (9 new rows). (Target: `packages/pipeline/src/tag/detect/
    canonical.test.ts`; Test: `npm test -w packages/pipeline` — 216/216 passing)
- [x] Task 6: Updated `packages/pipeline/src/tag/CLAUDE.md`'s "Canonical format" section.
      (Target: `packages/pipeline/src/tag/CLAUDE.md`)
- [x] Task 7: Re-ran `totalChartParity.test.ts` and `conjugateChartParity.test.ts` — real
      before/after numbers above. Bench 7.0%→0.7% (~10x). Squat/deadlift unchanged as
      expected; pushPull/total improved as a downstream ripple. (Target: `packages/app/src/
    pipeline/totalChartParity.test.ts`, `packages/app/src/pipeline/
    conjugateChartParity.test.ts`; Test: `npm test -w packages/app` — 200/200 passing)
- [x] Task 8: Full build/test pass, both packages — clean, single combined run. (Test: `npm
    run build -w packages/pipeline && npm run build -w packages/app && npm test -w
    packages/pipeline && npm test -w packages/app`)
- [x] Task 9: Docs — `SPECIFICATIONS.md`, this file, and `HANDOFF.md` updated to COMPLETE with
      real numbers. (Target: `SPECIFICATIONS.md`, `FIX_BOARD_COUNT.md`, `HANDOFF.md`)
- [x] Task 10 (QA): Independent full-suite re-verification via `qa-reviewer` — **PASS**.
      Re-ran build/test for both packages plus the parity tests directly: pipeline 12
      files/216 tests, app 19 files/200 tests, both builds clean, bench maxRelDiff confirmed
      at 0.7% (down from the 7.0% baseline). Numbers matched every individual task's
      independent verification exactly — no discrepancies found at final closeout.
