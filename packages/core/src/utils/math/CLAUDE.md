# math/

Core numerical computations for e1RM estimation and cross-exercise normalization.

## Files

- **`e1rm.ts`** — Epley formula and session-grid interpolation. `calcE1RM` / `invertE1RM` are the single source of truth for the formula — never inline it elsewhere.
- **`repCalculator.ts`** — Cross-exercise e1RM estimation (`findBestE1RM`) and per-set normalization (`normalizeToBaseE1RM`). `findBestE1RM` takes `SessionStats`; `normalizeToBaseE1RM` takes `RepCalcStats`.

## Key invariants

`fitVariantFactor` stores a **ratio** (variant e1RM ÷ baseline e1RM); `fitAddlWtOffset` stores an **additive weight delta** (straight weight − variant bar weight). These are not interchangeable: variant factors are used for cross-family normalization, offsets for same-family addlWt adjustment.

`findBestE1RM` always anchors to the comp baseline's `projectedE1RM` and applies the target's `variantFactor`. For chain/band exercises, the variant factor is chain-stripped (fitted on `adjustedSessions`) and the `addlWtOffset` is subtracted afterward as an approximation of the effective chain weight.

`normalizeToBaseE1RM` must strip addlWt offsets from the source before dividing by the variant factor when doing cross-family normalization, because variant factors are fitted against chain-stripped weights in `buildSessionStats`.
