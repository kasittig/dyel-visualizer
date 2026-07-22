# features/team-view

Team view for comparing a single exercise across multiple lifters. This feature is architecturally different from every other feature in the app: it does NOT use `PipelineContext`/`usePipelineModel()` at all, because it needs to fan out over MANY lifters' `PipelineModel`s simultaneously (one per row in the table) rather than the single model the rest of the app operates on via `PipelineContext`. The table is built from the shared `Table`/`TableCard`/`TableHeadRow`/`TableRow`/`TableCell` primitives in `shared/components/Table.tsx` (the same primitives `DiagnosticsPanel`/`AccessoryTable` use), with page-local modifier classes (`columnDivider`, `placeholderCell`, `controlCell`, `cellTint`) layered on via `TableCell`'s `className` prop.

| File                      | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TeamViewPage.tsx`        | Page component (typeahead exercise selector + reps input + unit toggle + lifter comparison table); lazy-loaded via `?page=team` query param in `main.tsx` (note: `?page=coach` is supported as a backward-compatible alias); renders per-row exercise/reps override controls in table via `EffortPopover` (reps input with double-click-to-reveal RPE/% popover); renders the facet filter select row; renders the Lift Type chip row; the e1RM column renders the shared `E1RMCell` (`shared/components/E1RMCell.tsx`), passing `actualDisplay`/`projectedDisplay`/`sourceLabel` from the row so a viewer can toggle between the raw and projected-to-today e1RM, matching `RepCalculator`'s toggle |
| `useTeamViewData.ts`      | Fetches the published index CSV and uses `loadIndexPipelineModels` from `@dyel/api` to concurrently load and parse each lifter's `PipelineModel`; returns status/data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `useTeamViewSelection.ts` | Derives exercise typeahead options, selected-exercise/reps/unit UI state, and per-lifter `TeamViewRow` display rows across all loaded lifters' models; also derives per-lifter exercise/reps overrides (`overridesByLifter`); also derives global facet-filter state (Bar/Stance/Equipment/Additional Weight) narrowing `exerciseOptions`; also derives a fifth, independent Lift Type chip filter narrowing `exerciseOptions`; also derives `e1rmProjectedDisplay`/`e1rmSourceLabel` per row via `resolveE1RMEstimate` from `@dyel/api` (reading the `'e1rm-max-effort'` deriver, distinct from the `'e1rm'` deriver `e1rmDisplay` reads from) for `TeamViewPage`'s `E1RMCell` toggle               |
| `TeamViewPage.module.css` | Page-local styling (header layout, reps input, page-local table modifier classes like `columnDivider`/`placeholderCell`/`controlCell`/`cellTint`); base table chrome comes from `shared/components/Table.module.css`; removed `.lastPerformedCell` after splitting "Last performed" into "Date" and "Last set" columns                                                                                                                                                                                                                                                                                                                                                                               |

**Default selection:** `useTeamViewSelection` auto-selects the first `exerciseOptions` entry once
lifter data has loaded and nothing has been explicitly selected yet, so the table renders
immediately instead of requiring the viewer to pick an exercise first. An explicit user selection
(via `setSelectedDisplayName`) is never overridden by this default.

**Placeholder rows:** `rows` always contains one entry per lifter in `results` (never omits a
lifter), regardless of whether that lifter has e1RM data for the selected canonical. Lifters with
no data for the selected exercise, or whose sheet failed to load (`status: 'error'`), get a
placeholder row (`hasData: false`, em-dash values, and `lastPerformedDateDisplay` of `'—'` and `lastPerformedSetDisplay` of `'No data
logged'`/`'Failed to load'`) so whoever's viewing can see the full roster at a glance. `TeamViewPage.tsx`
renders these with the muted `styles.placeholderCell` class.

**Per-lifter overrides:** `useTeamViewSelection` keeps a `Map<lifterName, { displayName?,
reps? }>` (`overridesByLifter`) so a viewer can pin an individual lifter's row to a different
exercise and/or rep count than the top-level selectors. `rows` resolves each lifter's
`effectiveDisplayName`/`effectiveReps` as `override ?? top-level value`, and each row carries
`onExerciseChange`/`onRepsChange` closures (bound to that lifter's name) that
`TeamViewPage.tsx` wires directly into a per-row `TypeaheadDropdown` (scoped to that lifter's
`availableExerciseOptions` — exercises with e1RM data for that lifter, or the full global list
if the sheet failed to load) and reps `<input>`, keeping the page component override-map-agnostic. Changing a top-level selector
(`setSelectedDisplayName`/`setReps`) resets only the matching field's per-lifter overrides
across all lifters — an exercise change doesn't clear reps overrides and vice versa — so a
lifter's override on the _other_ field survives a global change. Per-row inputs render and
stay interactive for every row regardless of `hasData`/load status, since overriding is often
exactly how a viewer finds data for a lifter with none under the current global selection;
placeholder styling (`placeholderCell`) still applies only to the derived display `<td>`s,
never to the input cells.

**Effort (RPE / %):** `useTeamViewSelection` owns top-level `effortMode` (default `'rpe'`) and `effortValue` (default `10`) state representing effort relative to the lifter's estimated 1RM — RPE10 and 100% are identity cases, yielding the same target weight as if effort were not modeled at all, matching prior behavior since all target-weight calculations were implicitly true-max before this feature. Both `targetWeightDisplay` AND `targetWeightProjectedDisplay` route through `predictWeightForRepsAndEffort(...)` from `@dyel/api` (not `predictWeightForReps(...)`), so effort composes dynamically with whichever e1RM (actual via `e1rmDisplay` or projected via `E1RMCell`'s toggle) the viewer currently has selected — effort conversions round-trip losslessly via `convertEffort(reps, effort, toMode)` when mode changes. Per-lifter `effort` overrides mirror the `reps`/`displayName` override pattern exactly: stored in `overridesByLifter`, resolved via `effectiveEffortMode`/`effectiveEffortValue` as `override?.effort ?? top-level`, with `onEffortModeChange`/`onEffortValueChange` closures (bound to each lifter) converting via `convertEffort(effectiveReps, ...)` before writing the override. Changing the top-level selector (`setEffortMode`/`setEffortValue`) resets only the `effort` field of per-lifter overrides (not `displayName`/`reps`), following the established per-field-reset convention. Unlike `reps`/`displayName`, there is no dedicated effort column — instead, effort is entered via `EffortPopover` (a component wrapping the Reps input in both the header and each table row): double-click the Reps cell to reveal a popover containing two chip buttons (`RPE` / `%`) to toggle mode and a numeric input for the value. A compact fixed-width badge (e.g., `RPE8` or `85%`) displays next to the Reps input when effort is non-default, always present in the DOM with `visibility: hidden` when default (matching `E1RMCell.tsx`'s projected-indicator pattern) to prevent column reflow — this is a deliberate space-saving design, keeping the table's footprint minimal while still surfacing the control for coaches programming submaximal work.

**Facet filtering:** `useTeamViewSelection` also owns four optional conjugate-facet filters
(Bar, Stance, Equipment, Additional Weight — the same vocabulary and `CONJUGATE_*` constants
`RepCalculator` uses, via `canonicalsMatchingFacets` from `@dyel/api`). All four default to
`null`/unselected, so the initial exercise dropdown state is always identical to the
unfiltered list — filtering only activates once a facet value is selected. When active, the
filter narrows the global `exerciseOptions` (and, transitively, every row's
`availableExerciseOptions`, since it's derived from `exerciseOptions`) to canonicals whose
tags (across all successfully-loaded lifters' `tagged` records) match every selected facet
field. Changing a facet resets only the top-level `explicitDisplayName` (not
`overridesByLifter`) — a lifter's per-row override survives a global facet change, consistent
with how a global exercise/reps change already only clears the matching field's overrides.

**e1RM projection:** Each `TeamViewRow` carries both `e1rmDisplay` (the raw/actual latest e1RM
point, unchanged) and `e1rmProjectedDisplay`/`e1rmSourceLabel` (the value projected to today via
`resolveE1RMEstimate` from `@dyel/api`, mirroring `usePipelineRepCalculator.ts`'s existing
projection logic). The projected fields read from the `'e1rm-max-effort'` deriver rather than the
`'e1rm'` deriver `e1rmDisplay` uses, so they can legitimately be `null` for accessory-lift-type
canonicals with no max-effort points — in that case `TeamViewPage.tsx`'s `E1RMCell` just renders
`e1rmDisplay` as a plain, non-toggleable value (same fallback behavior described in
`shared/components/CLAUDE.md`). `e1rmSourceLabel` is built via the shared `formatE1RMSourceLabel`
function from `@dyel/api` (the same function `RepCalculator` now uses), providing the single source of truth for the format. Each row also carries `showProjected` (whether to display the projected e1RM) and `onToggleProjected` (callback to flip it), backed by a new per-lifter `showProjectedByLifter: Map<string, boolean>` in `useTeamViewSelection`, mirroring the existing `overridesByLifter` pattern. Additionally, each row carries `targetWeightProjectedDisplay` (the target weight computed from the projected e1RM via inverse Epley + `roundTo5`, or null if unavailable), allowing `TeamViewPage.tsx`'s Target weight column to render the projected weight when `showProjected` is true, keeping the column in sync with the e1RM column's toggle state.

**Lift type filtering:** `useTeamViewSelection` also owns a fifth, independent filter — Lift
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

**Per-lifter sheet link:** Each `TeamViewRow` carries `url` (the lifter's Google Sheet URL,
threaded straight through from `LifterPipelineResult.url` — present on both the `'success'` and
`'error'` variants, so it's set for placeholder rows too). `TeamViewPage.tsx` renders a small
"↗" link icon next to the lifter's name in the Lifter column, pointing to
`/?sheet=<encodeURIComponent(row.url)>` with `target="_blank"` — this deep-links into the main
DYEL Visualizer (`useAppSettings.ts`'s `sheet` query-param handling) pre-loaded with that
lifter's data, opened in a new tab so the viewer doesn't lose their place in the comparison table.
The link is absolute-pathed (`/?sheet=...`, not `?sheet=...`) since Team View itself lives at
`/team`, and a relative href would otherwise resolve against that path instead of the app root.
