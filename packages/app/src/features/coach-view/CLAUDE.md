# features/coach-view

Coach view for comparing a single exercise across multiple lifters. This feature is architecturally different from every other feature in the app: it does NOT use `PipelineContext`/`usePipelineModel()` at all, because it needs to fan out over MANY lifters' `PipelineModel`s simultaneously (one per row in the coach's table) rather than the single model the rest of the app operates on via `PipelineContext`. The table is built from the shared `Table`/`TableCard`/`TableHeadRow`/`TableRow`/`TableCell` primitives in `shared/components/Table.tsx` (the same primitives `DiagnosticsPanel`/`AccessoryTable` use), with page-local modifier classes (`columnDivider`, `placeholderCell`, `controlCell`, `cellTint`) layered on via `TableCell`'s `className` prop.

| File                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CoachViewPage.tsx`        | Page component (typeahead exercise selector + reps input + unit toggle + lifter comparison table); lazy-loaded via `?page=coach` query param in `main.tsx`; renders per-row exercise/reps override controls in table; renders the facet filter select row; renders the Lift Type chip row; the e1RM column renders the shared `E1RMCell` (`shared/components/E1RMCell.tsx`), passing `actualDisplay`/`projectedDisplay`/`sourceLabel` from the row so the coach can toggle between the raw and projected-to-today e1RM, matching `RepCalculator`'s toggle                                                                                                                                |
| `useCoachViewData.ts`      | Fetches the published index CSV and uses `loadIndexPipelineModels` from `@dyel/api` to concurrently load and parse each lifter's `PipelineModel`; returns status/data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `useCoachViewSelection.ts` | Derives exercise typeahead options, selected-exercise/reps/unit UI state, and per-lifter `CoachViewRow` display rows across all loaded lifters' models; also derives per-lifter exercise/reps overrides (`overridesByLifter`); also derives global facet-filter state (Bar/Stance/Equipment/Additional Weight) narrowing `exerciseOptions`; also derives a fifth, independent Lift Type chip filter narrowing `exerciseOptions`; also derives `e1rmProjectedDisplay`/`e1rmSourceLabel` per row via `resolveE1RMEstimate` from `@dyel/api` (reading the `'e1rm-max-effort'` deriver, distinct from the `'e1rm'` deriver `e1rmDisplay` reads from) for `CoachViewPage`'s `E1RMCell` toggle |
| `CoachViewPage.module.css` | Page-local styling (header layout, reps input, page-local table modifier classes like `columnDivider`/`placeholderCell`/`controlCell`/`cellTint`); base table chrome comes from `shared/components/Table.module.css`; removed `.lastPerformedCell` after splitting "Last performed" into "Date" and "Last set" columns                                                                                                                                                                                                                                                                                                                                                                   |

**Default selection:** `useCoachViewSelection` auto-selects the first `exerciseOptions` entry once
lifter data has loaded and nothing has been explicitly selected yet, so the table renders
immediately instead of requiring the coach to pick an exercise first. An explicit user selection
(via `setSelectedDisplayName`) is never overridden by this default.

**Placeholder rows:** `rows` always contains one entry per lifter in `results` (never omits a
lifter), regardless of whether that lifter has e1RM data for the selected canonical. Lifters with
no data for the selected exercise, or whose sheet failed to load (`status: 'error'`), get a
placeholder row (`hasData: false`, em-dash values, and `lastPerformedDateDisplay` of `'—'` and `lastPerformedSetDisplay` of `'No data
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

**Facet filtering:** `useCoachViewSelection` also owns four optional conjugate-facet filters
(Bar, Stance, Equipment, Additional Weight — the same vocabulary and `CONJUGATE_*` constants
`RepCalculator` uses, via `canonicalsMatchingFacets` from `@dyel/api`). All four default to
`null`/unselected, so the initial exercise dropdown state is always identical to the
unfiltered list — filtering only activates once a coach picks a facet value. When active, the
filter narrows the global `exerciseOptions` (and, transitively, every row's
`availableExerciseOptions`, since it's derived from `exerciseOptions`) to canonicals whose
tags (across all successfully-loaded lifters' `tagged` records) match every selected facet
field. Changing a facet resets only the top-level `explicitDisplayName` (not
`overridesByLifter`) — a lifter's per-row override survives a global facet change, consistent
with how a global exercise/reps change already only clears the matching field's overrides.

**e1RM projection:** Each `CoachViewRow` carries both `e1rmDisplay` (the raw/actual latest e1RM
point, unchanged) and `e1rmProjectedDisplay`/`e1rmSourceLabel` (the value projected to today via
`resolveE1RMEstimate` from `@dyel/api`, mirroring `usePipelineRepCalculator.ts`'s existing
projection logic). The projected fields read from the `'e1rm-max-effort'` deriver rather than the
`'e1rm'` deriver `e1rmDisplay` uses, so they can legitimately be `null` for accessory-lift-type
canonicals with no max-effort points — in that case `CoachViewPage.tsx`'s `E1RMCell` just renders
`e1rmDisplay` as a plain, non-toggleable value (same fallback behavior described in
`shared/components/CLAUDE.md`). `e1rmSourceLabel` follows the same "Based on X · date" (exact
method) / "Projected from X (date)" (variant-factor method) format as `RepCalculator`'s caption, with " · projected N day(s) forward" appended when the data point is not current.

**Lift type filtering:** `useCoachViewSelection` also owns a fifth, independent filter — Lift
Type (`selectedLiftType`, one of `squat`/`bench`/`deadlift`/`accessory`, via `canonicalLiftType`
from `@dyel/api`) — rendered as tappable chips (`shared/liftTypeLabels.ts`'s
`LIFT_TYPE_LABELS`/`LIFT_TYPE_ORDER`, the same constants `RepCalculator` uses for its own Lift
Type chips) rather than a typed search, so narrowing the exercise list on mobile never requires
typing. Defaults to `null` ("All"), so the initial exercise dropdown state is always identical
to the unfiltered list. When active, it narrows `exerciseOptions` (and transitively every row's
`availableExerciseOptions`) the same way the four conjugate facets do, and composes with them
(both filters AND together — picking an incompatible lift type + facet combination can
legitimately produce an empty list, same as combining two incompatible conjugate facets already
can). `liftTypeOptions` only includes types actually present across all successfully-loaded
lifters' data, mirroring `RepCalculator`'s existing hide-the-accessory-chip-when-empty behavior.
Changing the lift type resets only the top-level `explicitDisplayName` (not
`overridesByLifter`), consistent with how the four conjugate facets and a global exercise/reps
change already behave.
