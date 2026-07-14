# features/coach-view

Coach view for comparing a single exercise across multiple lifters. This feature is architecturally different from every other feature in the app: it does NOT use `PipelineContext`/`usePipelineModel()` at all, because it needs to fan out over MANY lifters' `PipelineModel`s simultaneously (one per row in the coach's table) rather than the single model the rest of the app operates on via `PipelineContext`. CSS styling is composed from `features/lift/DiagnosticsPanel.module.css`'s CSS Modules classes rather than duplicated.

| File                       | Purpose                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CoachViewPage.tsx`        | Page component (typeahead exercise selector + reps input + unit toggle + lifter comparison table); lazy-loaded via `?page=coach` query param in `main.tsx`            |
| `useCoachViewData.ts`      | Fetches the published index CSV and uses `loadIndexPipelineModels` from `@dyel/api` to concurrently load and parse each lifter's `PipelineModel`; returns status/data |
| `useCoachViewSelection.ts` | Derives exercise typeahead options, selected-exercise/reps/unit UI state, and per-lifter `CoachViewRow` display rows across all loaded lifters' models                |
| `CoachViewPage.module.css` | Page and table styling, with table classes composed from `features/lift/DiagnosticsPanel.module.css` via CSS Modules `composes` directive                             |

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
