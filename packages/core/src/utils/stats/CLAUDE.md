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

`generateDiagnostics` uses the private `isCompVariation` helper to decide whether an exercise seeds the anchor grid. An exercise is a competition variation (anchor) when: its `displayName` matches `anchorName`, OR it has standard bar + no addlWts + (no equipment OR pause bench) + (competition/null stance OR deadlift matching the user's primary stance). `isAnchor` is the exported wrapper around this logic.
