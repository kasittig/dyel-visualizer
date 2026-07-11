# features/sigma

Σ (competition-total overview) tab components and hooks.

| File                           | Purpose                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `SigmaTab.tsx`                 | "Σ" overview tab composing `TotalChart` + `SessionBarChart` + `SigmaChart` across all lift types; controls date range filtering |
| `TotalChart.tsx`               | Total-volume line chart wrapping `DateLineChart`; displays total by date                                                        |
| `SessionBarChart.tsx`          | Dark-card bar chart of main lifts vs. accessory volume per session                                                              |
| `SigmaChart.tsx`               | Σ overview radar (3+ lifts) or pie chart (<3 lifts); wraps `BaseRadarChart`                                                     |
| `usePipelineDatasets.ts`       | Calls `usePipelineModel()` and memoizes `buildDatasetsFromModel` to produce chart-ready Recharts rows                           |
| `usePipelineTotalChartData.ts` | Builds total chart data from pipeline model; applies TOTAL_CHART_SPECS and merges datasets into ChartPoint[]                    |
| `useSigmaChartData.ts`         | Wraps `usePipelineTotalChartData` and merges volume data by calendar date into total chart points                               |
