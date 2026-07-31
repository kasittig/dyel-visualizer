# shared/charts

Reusable Recharts-based visualization components. Nothing here has page-level logic or data fetching — all data arrives via props.

| File                       | Purpose                                                                                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BaseRadarChart.tsx`       | Generic Recharts radar wrapper; accepts `angleKey`, `unit`, `tooltip`, optional `onClick`                                                                                                                                                           |
| `DateLineChart.tsx`        | Line chart over time; also exports `ChartEmpty` for the no-data placeholder                                                                                                                                                                         |
| `TooltipCard.tsx`          | Shared tooltip card rendered inside Recharts `<Tooltip>`; also exports `ChartTooltip` component                                                                                                                                                     |
| `colors.ts`                | Color constants (SQUAT_COLOR, BENCH_COLOR, DEADLIFT_COLOR, PUSH_PULL_COLOR, TOTAL_COLOR) using CSS variables for dark-mode support                                                                                                                  |
| `MultiSeriesLineChart.tsx` | Generic multi-series line chart over `DateLineChart` + `ChartTooltip`; one `<Line>` per `seriesKeys` entry (colored via `LINE_COLORS` cycling, with optional highlight/click support); used by `ConjugateCharts` and team-view's `TeamHistoryChart` |

For design conventions, see CONVENTIONS.md.
