# hooks/conjugate

Hooks that fetch or derive conjugate-method data.

| File                       | Purpose                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `useConjugateData.ts`      | Fetches the sheet CSV and calls `parseConjugateData`; returns `ConjugateDataPair[]` (re-exported from `@dyel/core`)    |
| `useConjugateChartData.ts` | All data aggregation for `ConjugateCharts` (grouping, normalization, forward-fill); the component is presentation-only |
