# hooks/data

Hooks that derive or fetch display-ready data from conjugate pairs.

| File                            | Purpose                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useBaselineTargetExercises.ts` | Exports pure `computeBaselineTargetExercises` and hook wrapper; builds `baselineExByType` and `targetExByType` maps; shared by `TotalChart` and `SigmaRadarChart` |
| `useIndexData.ts`               | Fetches and parses the published index sheet CSV; returns `IndexEntry[]`                                                                                          |
| `useLastSessionStats.ts`        | Computes per-exercise stats from pair list — e1RM, last session, predicted e1RM, variant factors, resistance offsets                                              |
