import { useMemo } from 'react';
import { usePipelineModel } from '../../app/PipelineContext';
import { selectDiagnosticVariants, summarizeEffects, type DiagnosticVariant } from '@dyel/api';

export type { DiagnosticVariant } from '@dyel/api';

export interface DiagnosticResult {
  variants: DiagnosticVariant[];
  hasDeadlift: boolean;
  weakEffects: string[];
  overtrainedEffects: string[];
}

export function usePipelineDiagnostics(liftType?: string): DiagnosticResult {
  const { model } = usePipelineModel();

  const variants = useMemo(() => {
    return model ? selectDiagnosticVariants(model, liftType) : [];
  }, [model, liftType]);

  const hasDeadlift = variants.some((v) => v.lift.includes('deadlift'));
  const { weakEffects, overtrainedEffects } = useMemo(() => {
    return summarizeEffects(variants);
  }, [variants]);

  return { variants, hasDeadlift, weakEffects, overtrainedEffects };
}
