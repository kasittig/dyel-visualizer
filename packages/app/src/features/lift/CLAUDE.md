# features/lift

Per-lift tab components and hooks for conjugate method analysis, variation radar, and diagnostics.

| File                               | Purpose                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `LiftTabPanel.tsx`                 | Per-lift tab composing `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel` with shared variation-highlight state          |
| `ConjugateCharts.tsx`              | Presentation-only chart for one lift type; data aggregation in `usePipelineConjugateChartData`                                       |
| `VariationRadarChart.tsx`          | Per-lift variation radar wrapping `BaseRadarChart` + `TooltipCard`; clickable wedges highlight variations                            |
| `DiagnosticsPanel.tsx`             | Diagnostics panel using `usePipelineDiagnostics()` scoped to active lift tab via `liftType` prop; surfaces stale-variant status      |
| `usePipelineConjugateChartData.ts` | Data aggregation for `ConjugateCharts` (per-lift variations + normalized composite); pipeline-native best-set lookup via `@dyel/api` |
| `usePipelineVariationRadarData.ts` | Data aggregation for `VariationRadarChart` (last-session details, e1RM snapshots — raw and cross-exercise-normalized)                |
| `usePipelineDiagnostics.ts`        | Consumes pipeline model diagnostics; exposes filtered/aggregated findings scoped to optional `liftType`                              |
