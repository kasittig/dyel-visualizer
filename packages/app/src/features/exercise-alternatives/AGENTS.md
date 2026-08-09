# features/exercise-alternatives

Standalone exercise-alternatives page. It does not use pipeline context or fetch training-sheet
data and is lazy-loaded by `main.tsx` for `?page=alternatives` and `/alternatives`.

| File                                  | Purpose                                                     |
| ------------------------------------- | ----------------------------------------------------------- |
| `ExerciseAlternativesPage.tsx`        | Responsive page shell and root-safe navigation              |
| `ExerciseAlternativesPage.module.css` | Page layout and visual treatment                            |
| `ExerciseAlternativesPage.test.tsx`   | Shell and local/GitHub Pages back-navigation smoke coverage |
| `index.ts`                            | Public feature barrel                                       |

Keep interactive search and recommendation derivation outside the page component. The component
must remain independent of `PipelineProvider`, `@dyel/pipeline`, and sheet data.
