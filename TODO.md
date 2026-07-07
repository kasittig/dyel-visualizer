# TODOs

## UI / UX

- [x] Collapse to a single page: remove the Exercises / Charts tabs and show everything together
- [x] Add a single exercise selector that filters all content on the page
- [x] Show only one exercise at a time (click to select from the exercise list)
- [x] Redesign Charts to show per-rep-count lines with visibility toggles (instead of E1RM + volume)
- [x] Redesign ExerciseList columns: Movement, Last 1RM, Latest e1RM

## Bugs / correctness

- [x] `findCol` matches the first column containing "weight", which may hit "Bodyweight (lbs)" before "Weight (lbs)" — fix so bodyweight is excluded from E1RM/volume calculations
- [x] CSV parsing breaks when a cell value contains a comma — replace the naive split with `papaparse`

## Code quality

- [x] Deduplicate `calcE1RM` — currently copy-pasted in both `Charts.tsx` and `ExerciseList.tsx`; move to a shared utility
- [x] Add ESLint, Prettier, and lint-staged
- [x] Add Vitest and CI (lint, build, test on every push/PR)
- [x] Add Husky pre-commit hook (lint-staged + tests) and post-merge hook (npm install)
- [x] Deploy to GitHub Pages only after CI passes

## Reliability

- [x] Add an error boundary so unhandled React errors show a message instead of a blank page

## Performance

- [x] Bundle is ~540KB (mostly recharts) — evaluate a lighter charting library or lazy-load the charts with dynamic `import()` so they don't block initial render

## Accessibility

- [ ] Clickable `<tr>` rows in ExerciseList have no keyboard support or ARIA roles — add `role="button"`, `tabIndex`, and `onKeyDown` so keyboard-only users can select exercises

## Future ideas

- [ ] Multi-sheet support — closed; only works with unpublished sheets which is outside the app's scope
