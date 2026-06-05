# TODOs

## UI / UX
- [ ] Collapse to a single page: remove the Exercises / Charts tabs and show everything together
- [ ] Add a single exercise dropdown (instead of per-tab selectors) that filters all content on the page
- [ ] Show only one exercise at a time (driven by the dropdown above)

## Bugs / correctness
- [x] `findCol` matches the first column containing "weight", which may hit "Bodyweight (lbs)" before "Weight (lbs)" — fix so bodyweight is excluded from E1RM/volume calculations
- [x] CSV parsing breaks when a cell value contains a comma — replace the naive split with `papaparse`

## Code quality
- [x] Deduplicate `calcE1RM` — currently copy-pasted in both `Charts.tsx` and `ExerciseList.tsx`; move to a shared utility

## Reliability
- [x] Add an error boundary so unhandled React errors show a message instead of a blank page

## Performance
- [x] Bundle is ~540KB (mostly recharts) — evaluate a lighter charting library or lazy-load the charts with dynamic `import()` so they don't block initial render

## Future ideas
- [ ] Multi-sheet support — expose a tab/sheet picker; `useSheetData` already accepts a `gid` param but it's hardcoded to `"0"` at the call site
