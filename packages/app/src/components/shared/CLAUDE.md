# components/shared

Reusable UI components used across multiple features or pages.

| File                          | Purpose                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CollapsibleSection.tsx`      | Collapsible titled section; used by `SigmaTab` and `LiftTabPanel`                                                                                                                                       |
| `DateRangePicker.tsx`         | Date range input using `react-day-picker` + Radix Popover                                                                                                                                               |
| `EditableDateChip.tsx`        | Inline date range display in section titles; click to edit                                                                                                                                              |
| `DiagnosticsPanel.tsx`        | Diagnostics panel using `usePipelineDiagnostics()` scoped to active lift tab via `liftType` prop (pipeline-native, all-time not date-range-filtered; surfaces `'stale'` status)                         |
| `ErrorBoundary.tsx`           | React error boundary wrapping the root in `main.tsx`                                                                                                                                                    |
| `InputModeToggle.tsx`         | UI toggle for switching between URL and paste-text input modes                                                                                                                                          |
| `RepCalculator.tsx`           | Calculator tab: render-only component displaying Rep Calculator UI; logic (state, e1RM estimation, weight-for-reps/reps-for-weight derivation) owned by `usePipelineRepCalculator` hook via `@dyel/api` |
| `StrengthScoreCalculator.tsx` | Strength score calculator: computes Wilks, DOTS, and Schwartz-Malone scores from bodyweight and competition total via `computeStrengthScores` from `@dyel/api`                                          |
| `SheetUrlPanel.tsx`           | Data source panel; toggles between a Sheet URL input and a paste-text input                                                                                                                             |
