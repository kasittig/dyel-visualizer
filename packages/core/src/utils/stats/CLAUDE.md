# stats/

Session-level aggregation, cross-exercise e1RM estimation, and filtering.

## Files

- **`sessionIndex.ts`** — Builds `SessionStats`: last session per exercise, addlWt offsets, variant factors relative to each lift's baseline, and projected e1RM (today's interpolated value). This is the primary input to `repCalculator.ts` and the chart builders.
- **`repCalculator.ts`** — Cross-exercise e1RM estimation (`findBestE1RM`) and per-set normalization (`normalizeToBaseE1RM`). `findBestE1RM` takes `SessionStats`; `normalizeToBaseE1RM` takes `RepCalcStats`. Imports `utils/math/e1rm` — this is the allowed direction (`stats/` depends on `math/`, never the reverse).
- **`exerciseFilters.ts`** — Filters `ConjugateDataPair[]` by bar/stance/addlWts/equipment. The `excludeVolumeWork` flag (default `true`) drops multi-set primary lift sessions.

Default selection logic (`defaultSelections.ts`) and deadlift-stance resolution (`resolveDeadliftStance.ts`) live in `utils/lifts/` — see its own `CLAUDE.md`.

## Key invariants

`findBestE1RM` always anchors to the comp baseline's `projectedE1RM` and applies the target's `variantFactor`. For chain/band exercises, the variant factor is chain-stripped (fitted on `adjustedSessions`) and the `addlWtOffset` is subtracted afterward as an approximation of the effective chain weight.

`normalizeToBaseE1RM` must strip addlWt offsets from the source before dividing by the variant factor when doing cross-family normalization, because variant factors are fitted against chain-stripped weights in `buildSessionStats`.
