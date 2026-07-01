# chart/

Chart grid helpers and display utilities, consumed by the chart builders in `load/`.

## Files

- **`chartGrid.ts`** — `DateValueGrid` type and three helpers (`isoDate`, `recordMax`, `sortedGridDates`). Used by both `load/buildChartData.ts` and `load/buildVariationChartData.ts` to keep max-per-date logic consistent.
- **`chartUtils.ts`** — `LINE_COLORS` array (CSS variables + hex); `formatDate` for display-ready date strings.
- **`setsRepsLabel.ts`** — Formats a best set as `"3×5 @ 315 lbs"`, counting how many sets in the session matched that weight/rep pair.

The chart data builders themselves (`buildChartData.ts`, `buildVariationChartData.ts`) live in `load/`, not here — see its `CLAUDE.md`.

## Key invariant

`isoDate` formats using **local** date components (not UTC), because CSV dates and the DayPicker both work in local time. Do not replace it with `date.toISOString().slice(0, 10)` — that would shift dates for users west of UTC.
