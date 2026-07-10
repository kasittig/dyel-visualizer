import type { PipelineModel, DatasetSpec, RenderParams, RechartsRow } from '@dyel/pipeline';
import { buildDatasetsFromModel } from '@dyel/pipeline';

/**
 * Builds chart-ready datasets from a pipeline model and dataset specifications.
 *
 * This is a thin pass-through wrapper to `buildDatasetsFromModel`, exposed as part of `@dyel/api`'s
 * public surface to allow `packages/app` to import via the sole `@dyel/api` boundary rather than
 * directly from `@dyel/pipeline`. The underlying function remains engine-internal per API_PHASE_1.md.
 *
 * **CRITICAL:** Callers MUST pass a referentially-stable `specs` array (e.g., module-level constant,
 * per the "specs are data" convention) and a memoized `ui` object, since both are useMemo dependencies
 * in consuming code. Unstable references will cause unnecessary recomputation.
 *
 * @param model Pipeline model from `runPipelineModel` (via the app's `usePipelineModel()`)
 * @param specs Stable array of dataset specifications (should be a module constant)
 * @param ui Memoized render parameters (chips, dateRange)
 * @returns Record mapping dataset IDs to their Recharts rows
 */
export function buildChartDatasets(
  model: PipelineModel,
  specs: DatasetSpec[],
  ui: RenderParams
): Record<string, RechartsRow[]> {
  return buildDatasetsFromModel(model, specs, ui);
}
