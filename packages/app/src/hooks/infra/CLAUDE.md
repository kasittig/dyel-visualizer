# hooks/infra

Low-level hooks for network I/O, sheet validation, and pasted-text validation.

| File                    | Purpose                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `useCsvResource.ts`     | Generic hook that fetches a CSV URL and parses it with a caller-supplied parser; used by `useConjugateData` and `useIndexData` |
| `useSheetValidation.ts` | On-demand sheet validation via `validateSheetCsv`; returns `SheetValidationResult`                                             |
| `useTextValidation.ts`  | Synchronous pasted-text validation via `validateTextData`; no fetch/abort (pure, in-memory); returns `TextValidationResult`    |
