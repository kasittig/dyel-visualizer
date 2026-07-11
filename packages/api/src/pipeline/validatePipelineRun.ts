import type { AthleteContext, PipelineResult, RawInput } from '@dyel/pipeline';
import { runPipeline } from '@dyel/pipeline';

/**
 * Thin wrapper over `runPipeline` from `@dyel/pipeline` — raw-input entry point
 * (see packages/api/CLAUDE.md Convention section).
 *
 * Matches the exact call shape the app's validation flow uses today
 * (`runPipeline([raw], [], athlete, {})`): no dataset specs and default render
 * params, so the result carries parse errors, unknown exercises, and
 * normalization diagnostics without building any chart datasets.
 */
export function validatePipelineRun(raw: RawInput[], athlete: AthleteContext): PipelineResult {
  return runPipeline(raw, [], athlete, {});
}
