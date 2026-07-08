import { usePipelineModel } from '../../context/PipelineContext';

export interface DiagnosticVariant {
  canonical: string;
  lift: string;
  effects: string[];
  status: 'optimal' | 'weakness' | 'overperforming';
  ratio: number;
  actualE1rmKg: number;
  expectedE1rmKg: number;
  staleDays: number;
}

export interface DiagnosticResult {
  variants: DiagnosticVariant[];
  hasDeadlift: boolean;
}

/**
 * Hook to retrieve diagnostics from the pipeline model.
 * Consumes the pipeline context and extracts variant diagnostics.
 *
 * @returns DiagnosticResult with variants and hasDeadlift flag
 */
export function usePipelineDiagnostics(): DiagnosticResult {
  const { model } = usePipelineModel();

  if (!model) {
    return { variants: [], hasDeadlift: false };
  }

  // Extract only the fields required by DiagnosticVariant
  const variants: DiagnosticVariant[] = model.diagnostics.variants.map((v) => ({
    canonical: v.canonical,
    lift: v.lift,
    effects: v.effects,
    status: v.status,
    ratio: v.ratio,
    actualE1rmKg: v.actualE1rmKg,
    expectedE1rmKg: v.expectedE1rmKg,
    staleDays: v.staleDays,
  }));

  const hasDeadlift = variants.some((v) => v.lift.includes('deadlift'));

  return { variants, hasDeadlift };
}
