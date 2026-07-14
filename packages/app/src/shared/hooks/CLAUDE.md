# shared/hooks

Low-level utility hooks for CSV fetching, localStorage persistence, and generic UI state (table sorting).

| File                      | Purpose                                                                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useCsvResource.ts`       | Generic hook that fetches a CSV URL and parses it with a caller-supplied parser; used by `useIndexData`                                                                                                                                                         |
| `useLocalStorageState.ts` | Generic `useState`-like hook that lazily reads from and syncs to `localStorage`; tolerates unavailable/corrupt storage via try/catch; optional `serialize`/`deserialize` for non-JSON-safe types                                                                |
| `useSortableRows.ts`      | Generic column-sort UI state: given `rows` and a `{ [columnKey]: accessor }` map, returns `sortedRows` plus `sortKey`/`direction`/`toggleSort`; used by `Table`-based components (`AccessoryTable`, `DiagnosticsPanel`) to make header cells clickable-sortable |
