# load/

Contains scripts dedicated to serving the transformed data.

Each file handles creating data for one frontend component in `@dyel/app`.

## Files

- **`buildChartData.ts`** — Produces `ChartPoint[]` for the main progress chart (squat / bench / deadlift / total). Normalizes every session's e1RM to the chosen target exercise via `normalizeToBaseE1RM`. A `total` field is added only once all three lifts have at least one data point.
- **`buildVariationChartData.ts`** — Produces per-variation timelines for the variation chart. Also emits a `__normalized__` series (keyed by `NORMALIZED_KEY`) that aggregates all variations onto the target exercise's scale. `showNormalized` is `false` when `normalizeToBaseE1RM` returned `null` for every session (no cross-exercise factor available).
- **`generateDiagnostics.ts`** — `generateDiagnostics(pairs, anchorName, precomputed, deadliftStance)` tags each non-anchor exercise `'weakness'` / `'optimal'` / `'overtrained'` by comparing its measured variant factor against expected performance ranges from `__MODIFIER__EFFECTS__` (a build-time-injected global — see `utils/lifts/CLAUDE.md`). Exercises with `addlWts` are excluded unless an addlWt offset sample exists — accommodating resistance otherwise makes e1RM comparisons unreliable.
