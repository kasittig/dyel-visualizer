import { useMemo } from 'react';
import { usePipelineModel } from '../../app/PipelineContext';
import { selectDiagnosticVariants, type DiagnosticVariant } from '@dyel/api';

export type { DiagnosticVariant } from '@dyel/api';

export interface DiagnosticResult {
  variants: DiagnosticVariant[];
  hasDeadlift: boolean;
}

/**
 * Hook to retrieve diagnostics from the pipeline model.
 * Consumes the pipeline context and extracts variant diagnostics.
 *
 * @param liftType - Optional lift type filter (e.g., 'squat', 'bench', 'deadlift').
 *                   When provided, only variants matching `lift:${liftType}` are returned.
 *                   When omitted, all variants are returned unfiltered.
 * @returns DiagnosticResult with filtered variants and hasDeadlift flag computed from the filtered set
 */
export function usePipelineDiagnostics(liftType?: string): DiagnosticResult {
  const { model } = usePipelineModel();

  const variants = useMemo(
    () => (model ? selectDiagnosticVariants(model, liftType) : []),
    [model, liftType]
  );

  const hasDeadlift = variants.some((v) => v.lift.includes('deadlift'));

  return { variants, hasDeadlift };
}
