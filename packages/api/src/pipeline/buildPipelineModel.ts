import type { AthleteContext, PipelineModel, RawInput } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';

/**
 * Thin wrapper over `runPipelineModel` from `@dyel/pipeline`.
 * Parses, normalizes, tags, and computes diagnostics for a set of raw inputs.
 *
 * @param raw - Array of raw inputs (CSV content or text entries)
 * @param athlete - Athlete context (sex, bodyweight, deadlift stance)
 * @returns Computed pipeline model with tagged records and diagnostics
 */
export function buildPipelineModel(raw: RawInput[], athlete: AthleteContext): PipelineModel {
  return runPipelineModel(raw, athlete);
}
