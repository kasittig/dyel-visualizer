import type { PipelineModel } from '@dyel/pipeline';

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
  addlWtOffset?: { offsetKg: number; n: number };
}

/**
 * Selects and filters diagnostic variants from the pipeline model.
 *
 * Extracts the diagnostic variants as DiagnosticVariant objects (a defined subset of
 * VariantAssessment fields). If liftType is provided, filters to only variants matching
 * `lift:${liftType}` tag. When liftType is undefined, returns all variants unfiltered.
 *
 * @param model - The PipelineModel containing diagnostics data
 * @param liftType - Optional lift type filter (e.g., 'squat', 'bench', 'deadlift')
 * @returns Array of DiagnosticVariant objects matching the filter
 */
export function selectDiagnosticVariants(
  model: PipelineModel,
  liftType?: string
): DiagnosticVariant[] {
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

  return variants;
}

/**
 * Effect summary type for diagnostic analysis.
 */
export interface EffectSummary {
  weakEffects: string[];
  overtrainedEffects: string[];
}

/**
 * Summarizes diagnostic effects from variant assessments.
 *
 * Tallies effect imbalances by:
 * - Scanning all variants with status 'weakness' or 'overperforming'
 * - For each effect in the variant, adding/subtracting 1 from a counter
 *   (weakness → -1, overperforming → +1)
 * - Collecting effects with negative count as weakEffects, positive as overtrainedEffects
 *
 * Effects with a count of exactly 0 (equal weakness/overperformance) are omitted.
 *
 * @param variants - DiagnosticVariant objects to analyze
 * @returns EffectSummary with weak and overtrained effect lists
 */
export function summarizeEffects(variants: DiagnosticVariant[]): EffectSummary {
  const counter = new Map<string, number>();

  for (const v of variants) {
    if (v.status !== 'overperforming' && v.status !== 'weakness') {
      continue;
    }

    const delta = v.status === 'overperforming' ? 1 : -1;
    for (const e of v.effects) {
      counter.set(e, (counter.get(e) ?? 0) + delta);
    }
  }

  const weakEffects: string[] = [];
  const overtrainedEffects: string[] = [];

  for (const [e, count] of counter) {
    if (count < 0) {
      weakEffects.push(e);
    } else if (count > 0) {
      overtrainedEffects.push(e);
    }
  }

  return { weakEffects, overtrainedEffects };
}
