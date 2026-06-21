# chart/

Chart data builders and supporting utilities.

## Files

- **`chartGrid.ts`** — `DateValueGrid` type and three helpers (`isoDate`, `recordMax`, `sortedGridDates`). Used by both chart builders to keep max-per-date logic consistent.
- **`buildChartData.ts`** — Produces `ChartPoint[]` for the main progress chart (squat / bench / deadlift / total). Normalizes every session's e1RM to the chosen target exercise via `normalizeToBaseE1RM`. A `total` field is added only once all three lifts have at least one data point.
- **`buildVariationChartData.ts`** — Produces per-variation timelines for the variation chart. Also emits a `__normalized__` series (keyed by `NORMALIZED_KEY`) that aggregates all variations onto the target exercise's scale. `showNormalized` is `false` when `normalizeToBaseE1RM` returned `null` for every session (no cross-exercise factor available).
- **`chartUtils.ts`** — `LINE_COLORS` array (CSS variables + hex); `formatDate` for display-ready date strings.
- **`setsRepsLabel.ts`** — Formats a best set as `"3×5 @ 315 lbs"`, counting how many sets in the session matched that weight/rep pair.

## Key invariant

`isoDate` formats using **local** date components (not UTC), because CSV dates and the DayPicker both work in local time. Do not replace it with `date.toISOString().slice(0, 10)` — that would shift dates for users west of UTC.
