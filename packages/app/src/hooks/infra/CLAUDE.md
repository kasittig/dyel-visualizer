# hooks/infra

Low-level hooks for network I/O and sheet validation.

| File                    | Purpose                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `useCsvResource.ts`     | Generic hook that fetches a CSV URL and parses it with a caller-supplied parser; used by `useConjugateData` and `useIndexData` |
| `useSheetValidation.ts` | On-demand sheet validation via `validateSheetCsv`; returns `SheetValidationResult`                                             |
