# components/shared

Reusable UI components used across multiple features or pages.

| File                     | Purpose                                                                         |
| ------------------------ | ------------------------------------------------------------------------------- |
| `CollapsibleSection.tsx` | Collapsible titled section; used by `SigmaTab` and `LiftTabPanel`               |
| `DateRangePicker.tsx`    | Date range input using `react-day-picker` + Radix Popover                       |
| `EditableDateChip.tsx`   | Inline date range display in section titles; click to edit                      |
| `DiagnosticsPanel.tsx`   | Diagnostics panel using `generateDiagnostics` from `@dyel/core`                 |
| `ErrorBoundary.tsx`      | React error boundary wrapping the root in `main.tsx`                            |
| `ExerciseFilters.tsx`    | Multi-facet filter controls (bar, stance, addl. weights, etc.)                  |
| `RepCalculator.tsx`      | Calculator tab: predicts weight-for-reps and reps-for-weight via `findBestE1RM` |
| `SheetUrlPanel.tsx`      | Sheet URL input and submit panel                                                |
