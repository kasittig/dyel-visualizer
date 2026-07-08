import { useMemo } from 'react';
import type { DatasetSpec, RenderParams, RechartsRow } from '@dyel/pipeline';
import { buildDatasetsFromModel } from '@dyel/pipeline';
import { usePipelineModel } from '../../context/PipelineContext';

/**
 * Hook that builds datasets from a pipeline model and dataset specs.
 *
 * **CRITICAL:** Callers MUST pass a referentially-stable `specs` array
 * (e.g., module-level constant, per the "specs are data" convention in
 * @dyel/pipeline/src/dataset/CLAUDE.md) and a memoized `ui` object,
 * since both are useMemo dependencies. Unstable references will cause
 * unnecessary recomputation on every render.
 *
 * @param specs - Stable array of dataset specifications (should be a module constant)
 * @param ui - Memoized render parameters (chips, dateRange)
 * @returns Record mapping dataset IDs to their Recharts rows; empty object if model is loading or unavailable
 */
export function usePipelineDatasets(
  specs: DatasetSpec[],
  ui: RenderParams
): Record<string, RechartsRow[]> {
  const { model } = usePipelineModel();

  return useMemo(() => (model ? buildDatasetsFromModel(model, specs, ui) : {}), [model, specs, ui]);
}
