# hooks/pipeline

Hooks that consume the pipeline model and build datasets for charts.

| File                           | Purpose                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `usePipelineDatasets.ts`       | Calls `usePipelineModel()` and memoizes `buildDatasetsFromModel(model, specs, ui)` to produce chart-ready Recharts rows      |
| `usePipelineTotalChartData.ts` | Fetches sheet CSV/pasted text and runs full pipeline orchestration (input resolution → model → datasets → chart aggregation) |
| `usePipelineDiagnostics.ts`    | Consumes pipeline model diagnostics and exposes filtered/aggregated findings for `DiagnosticsPanel`                          |
| `usePipelineRepCalculator.ts`  | Consumes pipeline model and provides weight-for-reps/reps-for-weight predictions                                             |
