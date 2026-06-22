# stats/

Session-level aggregation, diagnostics, filtering, and default selection logic.

## Files

- **`sessionIndex.ts`** — Builds `SessionStats`: last session per exercise, addlWt offsets, variant factors relative to each lift's baseline, and projected e1RM (today's interpolated value). This is the primary input to `math/repCalculator` and the chart builders.
- **`diagnostics.ts`** — Compares each variation's measured variant factor against expected performance ranges from `__MODIFIER__EFFECTS__` (a build-time-injected global declared in `global.d.ts` at the repo root). Tags exercises as `'weakness'` / `'optimal'` / `'overtrained'`. Exercises with `addlWts` are excluded — accommodating resistance makes e1RM comparisons unreliable.
- **`exerciseFilters.ts`** — Filters `ConjugateDataPair[]` by bar/stance/addlWts/equipment. The `excludeVolumeWork` flag (default `true`) drops multi-set primary lift sessions.
- **`defaultSelections.ts`** — Picks the initial baseline (most recent by date, then e1RM) and target (prefers paused bench, then any clean competition-stance exercise, then the first row).

## Key invariant — `__MODIFIER__EFFECTS__`

`diagnostics.ts` references `__MODIFIER__EFFECTS__` as a global. It is **not** a runtime import — it is injected by the Vite build via `vite.config.ts` `define`. The type declaration lives in `global.d.ts` at the repo root. The triple-slash reference at the top of `diagnostics.ts` pulls in that declaration for `tsc`.

## Anchor detection

`generateDiagnostics` uses `isCompVariation` (private to `diagnostics.ts`) to identify the anchor baseline: an exercise matches when `anchorName` equals `ex.displayName`, or (with no `anchorName`) when `stance === 'competition'`, bar is standard, equipment is null, and addlWts is empty. Accessory exercises (`type === 'accessory'`) are excluded from both anchor and variation groups. Deadlift stance resolution (sumo vs. conventional for `'opposite'` and `null` stances) is handled by the private `resolveDeadliftStance` helper.
