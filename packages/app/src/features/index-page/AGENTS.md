# features/index-page

Landing page listing linked sheets fetched from a hardcoded published index sheet.

| File              | Purpose                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `IndexPage.tsx`   | Landing page composing index-sheet entries; lazy-loaded via `?page=index` query param in `main.tsx`                                   |
| `useIndexData.ts` | Fetches the published index sheet CSV and parses it via `parseIndexCsv` from `@dyel/api`; returns `IndexEntry[]` via `useCsvResource` |

`IndexEntry`/`parseIndexCsv` moved to `@dyel/api/src/sheet/parseIndexCsv.ts` (see issue #477) so
`loadIndexPipelineModels` could reuse the same parser without duplicating it across packages. This
feature re-exports both from `@dyel/api` via its `index.ts` barrel for backward-compatible imports.
