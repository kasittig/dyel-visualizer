# components/charts

Reusable Recharts-based visualization components. Nothing here has page-level logic or data fetching — all data arrives via props.

| File                      | Purpose                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `BaseRadarChart.tsx`      | Generic Recharts radar wrapper; accepts `angleKey`, `unit`, `tooltip`, optional `onClick` |
| `DateLineChart.tsx`       | Line chart over time; also exports `ChartEmpty` for the no-data placeholder               |
| `SigmaChart.tsx`          | Σ overview — radar for 3+ lifts, pie chart for <3 lifts; wraps `BaseRadarChart`           |
| `TooltipCard.tsx`         | Shared tooltip card rendered inside Recharts `<Tooltip>`                                  |
| `TotalChart.tsx`          | Total-volume line chart; wraps `DateLineChart`                                            |
| `VariationRadarChart.tsx` | Per-lift variation radar; wraps `BaseRadarChart` + `TooltipCard`; clickable wedges        |
