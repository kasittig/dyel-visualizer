# hooks/infra

Low-level hooks for network I/O, sheet validation, pasted-text validation, pipeline validation, and localStorage persistence.

| File                       | Purpose                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useCsvResource.ts`        | Generic hook that fetches a CSV URL and parses it with a caller-supplied parser; used by `useConjugateData` and `useIndexData`                                                                   |
| `useSheetValidation.ts`    | On-demand sheet validation via `validateSheetCsv`; returns `SheetValidationResult`                                                                                                               |
| `useTextValidation.ts`     | Synchronous pasted-text validation via `validateTextData`; no fetch/abort (pure, in-memory); returns `TextValidationResult`                                                                      |
| `usePipelineValidation.ts` | Covers both input modes (URL and text) for pipeline validation via `runPipeline`; exposes `validateUrl` (fetches CSV) and `validateText` (synchronous); returns `PipelineResult`                 |
| `useLocalStorageState.ts`  | Generic `useState`-like hook that lazily reads from and syncs to `localStorage`; tolerates unavailable/corrupt storage via try/catch; optional `serialize`/`deserialize` for non-JSON-safe types |
