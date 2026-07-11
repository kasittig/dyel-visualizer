# app

Top-level app component and orchestration hooks. `App.tsx` composes these three in sequence: `useAppSettings()` → `usePipelineOrchestration(...)` → `useVisualizerData(...)`.

| File                          | Purpose                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                     | Root component wrapping `PipelineProvider`; manages tab nav, data flow, and page/tab routing                                                                                                          |
| `appTabs.ts`                  | Tab type aliases and `MAIN_TABS` constant                                                                                                                                                             |
| `PipelineContext.tsx`         | Context provider (`PipelineProvider`) and consumer hook (`usePipelineModel`) for sharing pipeline model downstream                                                                                    |
| `useAppSettings.ts`           | Settings state (url, inputMode, pastedText, activeTab, deadliftStance — localStorage-backed), transient UI state, date range, query-param reconciliation, URL-sync effect, athlete memo, and handlers |
| `usePipelineOrchestration.ts` | Raw input resolution, model building via `@dyel/api`, raw-data caching for instant revisit, effective status/model computation                                                                        |
| `useVisualizerData.ts`        | Model-derived data (tabRows, visibleLiftIds, canonicals, dataUnit, volume, session dates) via `@dyel/api` selectors                                                                                   |
