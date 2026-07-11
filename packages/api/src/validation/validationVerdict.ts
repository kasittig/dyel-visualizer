import type { PipelineResult } from '@dyel/pipeline';

export function classifyPipelineVerdict(result: PipelineResult): 'error' | 'warning' | 'ok' {
  if (result.parseErrors.length > 0) {
    return 'error';
  }
  if (result.unknownExercises.length > 0 || result.unnormalized.length > 0) {
    return 'warning';
  }
  return 'ok';
}
