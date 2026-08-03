import type { PipelineModel, UnassessedVariant } from '@dyel/pipeline';

export type { UnassessedVariant } from '@dyel/pipeline';

export interface DiagnosticVariant {
  canonical: string;
  displayName: string;
  lift: string;
  effects: string[];
  status: 'optimal' | 'weakness' | 'overperforming' | 'stale';
  fittedStatus: 'optimal' | 'weakness' | 'overperforming' | null;
  ratio: number;
  actualE1rmKg: number;
  expectedE1rmKg: number;
  baselineE1rmKg: number;
  expectedFactor: number;
  latestAt: number;
  previousE1rmKg: number | null;
  observationCount: number;
  comparisonCount: number | null;
  staleDays: number;
  averageIndex: number;
  expectedBaseline: string | null;
  isCompLift: boolean;
  addlWtOffset?: { offsetKg: number; n: number };
}

export interface EffectSummary {
  weakEffects: string[];
  overtrainedEffects: string[];
}

export interface DiagnosticAttentionSummary {
  belowCount: number;
  aboveCount: number;
  leadingBelowEffect: { effect: string; count: number } | null;
}

export function selectDiagnosticVariants(
  model: PipelineModel,
  liftType?: string
): DiagnosticVariant[] {
  // Dynamically map properties to safely preserve the strict DiagnosticVariant shape
  const list = model.diagnostics.variants.map((v) => ({
    canonical: v.canonical,
    displayName: v.displayName,
    lift: v.lift,
    effects: v.effects,
    status: v.status,
    fittedStatus: v.fittedStatus,
    ratio: v.ratio,
    actualE1rmKg: v.actualE1rmKg,
    expectedE1rmKg: v.expectedE1rmKg,
    baselineE1rmKg: v.baselineE1rmKg,
    expectedFactor: v.expectedFactor,
    latestAt: v.latestAt,
    previousE1rmKg: v.previousE1rmKg,
    observationCount: v.observationCount,
    comparisonCount: v.comparisonCount,
    staleDays: v.staleDays,
    averageIndex: v.averageIndex,
    expectedBaseline: v.expectedBaseline,
    isCompLift: v.isCompLift,
    addlWtOffset: v.addlWtOffset,
  }));

  return liftType ? list.filter((v) => v.lift === `lift:${liftType}`) : list;
}

export function selectUnassessedDiagnostics(
  model: PipelineModel,
  liftType?: string
): UnassessedVariant[] {
  return liftType
    ? model.diagnostics.unassessed.filter(
        (item) =>
          item.lift === `lift:${liftType}` || (liftType === 'accessory' && item.lift === null)
      )
    : model.diagnostics.unassessed;
}

export function summarizeEffects(variants: DiagnosticVariant[]): EffectSummary {
  const counter = new Map<string, number>();

  for (const v of variants) {
    if (v.status === 'overperforming' || v.status === 'weakness') {
      const delta = v.status === 'overperforming' ? 1 : -1;
      for (const e of v.effects) {
        counter.set(e, (counter.get(e) ?? 0) + delta);
      }
    }
  }

  const weakEffects: string[] = [];
  const overtrainedEffects: string[] = [];

  for (const [e, count] of counter) {
    if (count < 0) {
      weakEffects.push(e);
    }
    if (count > 0) {
      overtrainedEffects.push(e);
    }
  }

  return { weakEffects, overtrainedEffects };
}

export function summarizeDiagnosticAttention(
  variants: DiagnosticVariant[]
): DiagnosticAttentionSummary {
  let belowCount = 0;
  let aboveCount = 0;
  const belowEffects = new Map<string, number>();

  for (const variant of variants) {
    if (variant.status === 'weakness') {
      belowCount += 1;
      for (const effect of variant.effects) {
        belowEffects.set(effect, (belowEffects.get(effect) ?? 0) + 1);
      }
    } else if (variant.status === 'overperforming') {
      aboveCount += 1;
    }
  }

  let leadingBelowEffect: DiagnosticAttentionSummary['leadingBelowEffect'] = null;
  for (const [effect, count] of belowEffects) {
    if (
      !leadingBelowEffect ||
      count > leadingBelowEffect.count ||
      (count === leadingBelowEffect.count && effect.localeCompare(leadingBelowEffect.effect) < 0)
    ) {
      leadingBelowEffect = { effect, count };
    }
  }

  return { belowCount, aboveCount, leadingBelowEffect };
}
