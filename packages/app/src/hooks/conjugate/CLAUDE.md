# hooks/conjugate

Hooks that fetch or derive conjugate-method data.

| File                  | Purpose                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `useConjugateData.ts` | Fetches the sheet CSV and calls `parseConjugateData`; returns `ConjugateDataPair[]` (re-exported from `@dyel/core`) |

`ConjugateCharts`' data aggregation was migrated to `@dyel/pipeline` and now lives in
`hooks/pipeline/usePipelineConjugateChartData.ts` (see that directory's `CLAUDE.md`) — there
is no `useConjugateChartData.ts` here anymore.
