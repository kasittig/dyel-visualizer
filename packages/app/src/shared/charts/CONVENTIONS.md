Chart conventions in packages/app/src/components/charts/

Layered composition. There are two generic "base" wrappers, and feature-specific charts compose them:

- BaseRadarChart.tsx — generic Recharts radar wrapper (angleKey, unit, tooltip, optional onClick)
- DateLineChart.tsx — generic Recharts line-chart shell over a date X-axis; also exports ChartEmpty for the shared "No data found." placeholder
- SigmaChart.tsx wraps BaseRadarChart (radar for 3+ lifts) or falls back to a raw PieChart (<3 lifts)
- TotalChart.tsx wraps DateLineChart, supplying <Line> children per series
- VariationRadarChart.tsx wraps BaseRadarChart like the others, passing `overlayDataKey` to render the target ring as a second overlay radar.

Presentation-only. Per the directory's CLAUDE.md: "Nothing here has page-level logic or data fetching — all data arrives via props." Data aggregation lives in hooks (e.g. usePipelineConjugateChartData), not in these components.

Shared visual primitives:

- TooltipCard.tsx — shared floating card div, used inside custom Recharts <Tooltip> content
- Fixed lift-color palette centralized in `colors.ts` (`SQUAT_COLOR`/`BENCH_COLOR`/`DEADLIFT_COLOR`/`PUSH_PULL_COLOR`/`TOTAL_COLOR`, each a CSS custom-property reference like `var(--chart-2-pink)`, not a hardcoded hex value), imported by both SigmaChart.tsx and TotalChart.tsx. `ConjugateCharts.tsx` (in `components/conjugate/`) uses a separate palette, `@dyel/pipeline`'s `LINE_COLORS`, for its per-variation lines.
- Custom polar-axis tick rendering (offset labels 10% from center, fontSize 11) — duplicated identically between BaseRadarChart.tsx and VariationRadarChart.tsx
- ResponsiveContainer always wraps the chart; radar charts are fixed at height 340, line charts default to 300

Styling. Each component has a co-located CSS module (X.module.css); no inline style objects except for one-off layout tweaks (e.g. SigmaChart's pie-centering <div>).

State/interactivity. Click-to-select wedges pattern: onClick/onVariationClick props read chartData.activeLabel from the underlying Recharts callback and only fire if it's a non-empty string. VariationRadarChart wraps its chart in a shared `CollapsibleSection` component for expand/collapse state.

Animation off for time series: all <Line> elements in TotalChart set isAnimationActive={false} and connectNulls (sparse/gappy session data).

Naming/exports: flat index.ts barrel re-exporting every component (and ChartEmpty) by name; no default exports.
