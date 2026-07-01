# math/

Core numerical computations for e1RM estimation and cross-exercise normalization.

## Files

- **`e1rm.ts`** — Epley formula and session-grid interpolation. `calcE1RM` / `invertE1RM` are the single source of truth for the formula — never inline it elsewhere.
- **`volume.ts`** — per-day tonnage totals from pre-filtered session pairs (`calculateVolumeCorrelation`). Takes `ConjugateDataPair[]` and sums every pair with no type filtering — callers pre-filter before calling.
- **`metrics.ts`** — `calculateMetrics(bodyweight, total, gender, units)` computes dots/wilks/schwartzmalone scores and their percentiles (`LiftMetrics`). Uses the ambient global `__COEFFICIENTS__`, injected by the Vite build (same mechanism as `__MODIFIER__EFFECTS__` — see `utils/lifts/CLAUDE.md`).

Cross-exercise e1RM estimation (`findBestE1RM`, `normalizeToBaseE1RM`) lives in `utils/stats/repCalculator.ts`, not here — it depends on `SessionStats` from `utils/stats/sessionIndex.ts`, so it belongs on the `stats/` side of the dependency line described in the parent `CLAUDE.md`.

## Key invariants

`fitVariantFactor` stores a **ratio** (variant e1RM ÷ baseline e1RM); `fitAddlWtOffset` stores an **additive weight delta** (straight weight − variant bar weight). These are not interchangeable: variant factors are used for cross-family normalization, offsets for same-family addlWt adjustment.

See `utils/stats/CLAUDE.md` for how `findBestE1RM` and `normalizeToBaseE1RM` (in `utils/stats/repCalculator.ts`) consume these values.
