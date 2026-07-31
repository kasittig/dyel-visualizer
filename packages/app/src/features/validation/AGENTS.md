# features/validation

Sheet/pasted-text structural validation and pipeline validation pages.

| File                         | Purpose                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ValidatorPage.tsx`          | Sheet/pasted-text validator page using `useSheetValidation` and `useTextValidation`; checks CSV structure, header format, row format |
| `PipelineValidationPage.tsx` | Pipeline validation page showing parse errors, unknown exercises, and normalization issues via `usePipelineValidation`               |
| `useSheetValidation.ts`      | On-demand sheet validation hook via `validateSheetCsv` from `@dyel/api`                                                              |
| `useTextValidation.ts`       | Synchronous pasted-text validation hook via `validateTextData` from `@dyel/api`                                                      |
| `usePipelineValidation.ts`   | Pipeline validation hook covering both input modes (URL fetch and pasted text); exposes `validateUrl` and `validateText` functions   |
