# shared/hooks

Low-level utility hooks for CSV fetching and localStorage persistence.

| File                      | Purpose                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useCsvResource.ts`       | Generic hook that fetches a CSV URL and parses it with a caller-supplied parser; used by `useIndexData`                                                                                          |
| `useLocalStorageState.ts` | Generic `useState`-like hook that lazily reads from and syncs to `localStorage`; tolerates unavailable/corrupt storage via try/catch; optional `serialize`/`deserialize` for non-JSON-safe types |
