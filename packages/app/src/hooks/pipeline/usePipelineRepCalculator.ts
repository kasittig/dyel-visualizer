import type { NormalizationModel } from '@dyel/pipeline';
import { usePipelineModel } from '../../context/PipelineContext';

const DEFAULT_MODEL: NormalizationModel = {
  fittedAt: Date.now(),
  baseline: {},
  variantFactor: {},
  addlWtOffset: {},
};

/**
 * Hook that provides the NormalizationModel from the shared pipeline infrastructure.
 *
 * This hook consumes the pipeline model via usePipelineModel(), which orchestrates
 * input resolution and pipeline execution. Input resolution and fetch orchestration
 * are delegated to PipelineProvider, not handled locally.
 *
 * @returns The NormalizationModel from the pipeline, or DEFAULT_MODEL if unavailable
 */
export function usePipelineRepCalculator(): NormalizationModel {
  const { status, model: pipelineModel } = usePipelineModel();

  // If the pipeline is loading or errored, return default model
  if (status !== 'success' || !pipelineModel) {
    return DEFAULT_MODEL;
  }

  // Extract the NormalizationModel from PipelineModel
  return pipelineModel.model;
}
