# features/training-tools

Public, spreadsheet-independent Training Tools workspace.

| File                           | Purpose                                                                                                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TrainingToolsPage.tsx`        | Public workspace landing page with canonical tool entry points, the universal Plate Calculator, and the Rep/e1RM Calculator in pipeline-independent manual mode. A local idle `PipelineProvider` satisfies the unified controller boundary without requiring a configured source. |
| `TrainingToolsPage.module.css` | Responsive workspace, action-card, and embedded-tool layout.                                                                                                                                                                                                                      |
| `TrainingToolsPage.test.tsx`   | Guest-state, canonical navigation, calculator interaction, and landmark coverage.                                                                                                                                                                                                 |
| `index.ts`                     | Feature barrel.                                                                                                                                                                                                                                                                   |
