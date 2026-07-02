# components/pages

Top-level page and tab-panel components. These are the entry points rendered by `main.tsx` (via lazy imports) and `App.tsx` (tab panels). They compose charts and shared components.

| File                 | Purpose                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GettingStarted.tsx` | Onboarding checklist shown before any sheet URL is entered                                                                                        |
| `IndexPage.tsx`      | Landing page listing linked sheets; fetches from the hardcoded published index sheet via `useIndexData`                                           |
| `LiftTabPanel.tsx`   | Per-lift tab: composes `ConjugateCharts` + `VariationRadarChart` + `DiagnosticsPanel` with shared variation-highlight state                       |
| `SigmaTab.tsx`       | "Σ" overview tab: `TotalChart` + `SessionBarChart` + `SigmaRadarChart` across all lift types                                                      |
| `ValidatorPage.tsx`  | Sheet/pasted-text validator page; uses `useSheetValidation` and `useTextValidation`, toggled via the same url/text `InputMode` as `SheetUrlPanel` |

`main.tsx` lazy-imports `ConjugateInfoPage`, `IndexPage`, and `ValidatorPage` by page query param.
