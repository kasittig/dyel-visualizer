import { useMemo } from 'react';
import { buildChartDatasets } from '@dyel/api';
import type { DatasetSpec, RenderParams, RechartsRow } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';

export function usePipelineDatasets(
  specs: DatasetSpec[],
  ui: RenderParams
): Record<string, RechartsRow[]> {
  const { model } = usePipelineModel();
  return useMemo(() => {
    return model ? buildChartDatasets(model, specs, ui) : {};
  }, [model, specs, ui]);
}
