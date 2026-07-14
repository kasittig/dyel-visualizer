# features/coach-view

Coach view for comparing a single exercise across multiple lifters. This feature is architecturally different from every other feature in the app: it does NOT use `PipelineContext`/`usePipelineModel()` at all, because it needs to fan out over MANY lifters' `PipelineModel`s simultaneously (one per row in the coach's table) rather than the single model the rest of the app operates on via `PipelineContext`. The table is built from the shared `Table`/`TableCard`/`TableHeadRow`/`TableRow`/`TableCell` primitives in `shared/components/Table.tsx` (the same primitives `DiagnosticsPanel`/`AccessoryTable` use), with page-local modifier classes (`columnDivider`, `placeholderCell`) layered on via `TableCell`'s `className` prop.

| File                       | Purpose                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CoachViewPage.tsx`        | Page component (typeahead exercise selector + reps input + unit toggle + lifter comparison table); lazy-loaded via `?page=coach` query param in `main.tsx`; renders per-row exercise/reps override controls                   |
| `useCoachViewData.ts`      | Fetches the published index CSV and uses `loadIndexPipelineModels` from `@dyel/api` to concurrently load and parse each lifter's `PipelineModel`; returns status/data                                                         |
| `useCoachViewSelection.ts` | Derives exercise typeahead options, selected-exercise/reps/unit UI state, and per-lifter `CoachViewRow` display rows across all loaded lifters' models; also derives per-lifter exercise/reps overrides (`overridesByLifter`) |
| `CoachViewPage.module.css` | Page-local styling (header layout, reps input, page-local table modifier classes like `columnDivider`/`placeholderCell`); base table chrome comes from `shared/components/Table.module.css`                                   |

**Default selection:** `useCoachViewSelection` auto-selects the first `exerciseOptions` entry once
lifter data has loaded and nothing has been explicitly selected yet, so the table renders
immediately instead of requiring the coach to pick an exercise first. An explicit user selection
(via `setSelectedDisplayName`) is never overridden by this default.

**Placeholder rows:** `rows` always contains one entry per lifter in `results` (never omits a
lifter), regardless of whether that lifter has e1RM data for the selected canonical. Lifters with
no data for the selected exercise, or whose sheet failed to load (`status: 'error'`), get a
placeholder row (`hasData: false`, em-dash values, and a `lastPerformedDisplay` of `'No data
logged'`/`'Failed to load'`) so the coach can see the full roster at a glance. `CoachViewPage.tsx`
renders these with the muted `styles.placeholderCell` class.

**Per-lifter overrides:** `useCoachViewSelection` keeps a `Map<lifterName, { displayName?,
reps? }>` (`overridesByLifter`) so a coach can pin an individual lifter's row to a different
exercise and/or rep count than the top-level selectors. `rows` resolves each lifter's
`effectiveDisplayName`/`effectiveReps` as `override ?? top-level value`, and each row carries
`onExerciseChange`/`onRepsChange` closures (bound to that lifter's name) that
`CoachViewPage.tsx` wires directly into a per-row `TypeaheadDropdown` (scoped to that lifter's
`availableExerciseOptions` — exercises with e1RM data for that lifter, or the full global list
if the sheet failed to load) and reps `<input>`, keeping the page component override-map-agnostic. Changing a top-level selector
(`setSelectedDisplayName`/`setReps`) resets only the matching field's per-lifter overrides
across all lifters — an exercise change doesn't clear reps overrides and vice versa — so a
lifter's override on the _other_ field survives a global change. Per-row inputs render and
stay interactive for every row regardless of `hasData`/load status, since overriding is often
exactly how a coach finds data for a lifter with none under the current global selection;
placeholder styling (`placeholderCell`) still applies only to the derived display `<td>`s,
never to the input cells.
