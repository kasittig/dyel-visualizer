# features/index-page

Landing page listing linked sheets fetched from a hardcoded published index sheet.

| File               | Purpose                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `IndexPage.tsx`    | Landing page composing index-sheet entries; lazy-loaded via `?page=index` query param in `main.tsx` |
| `useIndexData.ts`  | Fetches and parses the published index sheet CSV; returns `IndexEntry[]` via `useCsvResource`       |
| `parseIndexCsv.ts` | Pure CSV parser for index sheet format; returns structured `IndexEntry[]`                           |
