import { usePipelineModel } from '../../context/PipelineContext';

export interface DiagnosticVariant {
  canonical: string;
  displayName: string;
  lift: string;
  effects: string[];
  status: 'optimal' | 'weakness' | 'overperforming' | 'stale';
  ratio: number;
  actualE1rmKg: number;
  expectedE1rmKg: number;
  staleDays: number;
  averageIndex: number;
  expectedBaseline: string | null;
  addlWtOffset?: { offsetLbs: number; n: number };
}

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

  if (!model) {
    return { variants: [], hasDeadlift: false };
  }

  // Extract only the fields required by DiagnosticVariant
  let variants: DiagnosticVariant[] = model.diagnostics.variants.map((v) => ({
    canonical: v.canonical,
    displayName: v.displayName,
    lift: v.lift,
    effects: v.effects,
    status: v.status,
    ratio: v.ratio,
    actualE1rmKg: v.actualE1rmKg,
    expectedE1rmKg: v.expectedE1rmKg,
    staleDays: v.staleDays,
    averageIndex: v.averageIndex,
    expectedBaseline: v.expectedBaseline,
    addlWtOffset: v.addlWtOffset,
  }));

  // Filter by liftType if provided
  if (liftType) {
    const liftTag = `lift:${liftType}`;
    variants = variants.filter((v) => v.lift === liftTag);
  }

  const hasDeadlift = variants.some((v) => v.lift.includes('deadlift'));

  return { variants, hasDeadlift };
}
