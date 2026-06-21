# math/

Core numerical computations for e1RM estimation and cross-exercise normalization.

## Files

- **`e1rm.ts`** — Epley formula and session-grid interpolation. `calcE1RM` / `invertE1RM` are the single source of truth for the formula — never inline it elsewhere.
- **`repCalculator.ts`** — Cross-exercise e1RM estimation (`findBestE1RM`) and per-set normalization (`normalizeToBaseE1RM`). Depends on `RepCalcStats` produced by `stats/sessionIndex`.

## Key invariants

`fitVariantFactor` stores a **ratio** (variant e1RM ÷ baseline e1RM); `fitAddlWtOffset` stores an **additive weight delta** (straight weight − variant bar weight). These are not interchangeable: variant factors are used for cross-family normalization, offsets for same-family addlWt adjustment.

`findBestE1RM` runs two phases in order: (1) same-family history with optional addlWt offset adjustment; (2) cross-family estimation through the baseline via variant factors. It returns the first phase that produces a result — never combines both.

`normalizeToBaseE1RM` must strip addlWt offsets from the source before dividing by the variant factor when doing cross-family normalization, because variant factors are fitted against chain-stripped weights in `buildSessionStats`.
