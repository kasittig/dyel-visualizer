# components/shared

Reusable UI components used across multiple features or pages.

| File                          | Purpose                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CollapsibleSection.tsx`      | Collapsible titled section; used by `SigmaTab` and `LiftTabPanel`                                                                                                               |
| `DateRangePicker.tsx`         | Date range input using `react-day-picker` + Radix Popover                                                                                                                       |
| `EditableDateChip.tsx`        | Inline date range display in section titles; click to edit                                                                                                                      |
| `DiagnosticsPanel.tsx`        | Diagnostics panel using `usePipelineDiagnostics()` scoped to active lift tab via `liftType` prop (pipeline-native, all-time not date-range-filtered; surfaces `'stale'` status) |
| `ErrorBoundary.tsx`           | React error boundary wrapping the root in `main.tsx`                                                                                                                            |
| `InputModeToggle.tsx`         | UI toggle for switching between URL and paste-text input modes                                                                                                                  |
| `ExerciseFilters.tsx`         | Multi-facet filter controls (bar, stance, addl. weights, etc.)                                                                                                                  |
| `RepCalculator.tsx`           | Calculator tab: predicts weight-for-reps and reps-for-weight using pipeline-native `findBestE1RMFromPipeline` via `usePipelineModel()`                                          |
| `StrengthScoreCalculator.tsx` | Strength score calculator: computes Wilks, DOTS, and Schwartz-Malone scores from bodyweight and competition total via `computeStrengthScores` from `@dyel/pipeline`             |
| `SheetUrlPanel.tsx`           | Data source panel; toggles between a Sheet URL input and a paste-text input                                                                                                     |
