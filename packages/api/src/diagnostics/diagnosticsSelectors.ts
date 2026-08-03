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
  latestSet: { weight: number; reps: number; rpe?: number; sets?: number } | null;
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

export interface DiagnosticEffectEvidence {
  effect: string;
  belowCount: number;
  aboveCount: number;
}

export interface DiagnosticAttentionSummary {
  belowCount: number;
  aboveCount: number;
  leadingBelowEffect: { effect: string; count: number } | null;
}

export interface DiagnosticEvidenceSummary extends DiagnosticAttentionSummary {
  effects: DiagnosticEffectEvidence[];
}

export function summarizeDiagnosticEvidence(
  variants: DiagnosticVariant[]
): DiagnosticEvidenceSummary {
  let belowCount = 0;
  let aboveCount = 0;
  let leadingBelowEffect: DiagnosticAttentionSummary['leadingBelowEffect'] = null;
  const evidence = new Map<string, { belowCount: number; aboveCount: number }>();
  for (const variant of variants) {
    if (variant.status !== 'weakness' && variant.status !== 'overperforming') {
      continue;
    }
    if (variant.status === 'weakness') {
      belowCount += 1;
    } else {
      aboveCount += 1;
    }
    for (const effect of variant.effects) {
      const counts = evidence.get(effect) ?? { belowCount: 0, aboveCount: 0 };
      counts[variant.status === 'weakness' ? 'belowCount' : 'aboveCount'] += 1;
      evidence.set(effect, counts);
      if (
        variant.status === 'weakness' &&
        (!leadingBelowEffect ||
          counts.belowCount > leadingBelowEffect.count ||
          (counts.belowCount === leadingBelowEffect.count &&
            effect.localeCompare(leadingBelowEffect.effect) < 0))
      ) {
        leadingBelowEffect = { effect, count: counts.belowCount };
      }
    }
  }
  const effects = Array.from(evidence, ([effect, counts]) => ({ effect, ...counts })).sort(
    (a, b) =>
      b.belowCount + b.aboveCount - (a.belowCount + a.aboveCount) ||
      a.effect.localeCompare(b.effect)
  );
  return {
    belowCount,
    aboveCount,
    leadingBelowEffect,
    effects,
  };
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
    latestSet: v.latestSet,
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
  const weakEffects: string[] = [];
  const overtrainedEffects: string[] = [];
  for (const effect of summarizeDiagnosticEvidence(variants).effects) {
    if (effect.belowCount > effect.aboveCount) {
      weakEffects.push(effect.effect);
    }
    if (effect.aboveCount > effect.belowCount) {
      overtrainedEffects.push(effect.effect);
    }
  }
  return { weakEffects, overtrainedEffects };
}

export function summarizeDiagnosticEffectEvidence(
  variants: DiagnosticVariant[]
): DiagnosticEffectEvidence[] {
  return summarizeDiagnosticEvidence(variants).effects;
}

export function summarizeDiagnosticAttention(
  variants: DiagnosticVariant[]
): DiagnosticAttentionSummary {
  const { belowCount, aboveCount, leadingBelowEffect } = summarizeDiagnosticEvidence(variants);
  return { belowCount, aboveCount, leadingBelowEffect };
}
