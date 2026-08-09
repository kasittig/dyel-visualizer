import type { PipelineModel, SymptomEvent, UnassessedVariant } from '@dyel/pipeline';

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
  symptomContext: {
    events: SymptomEvent[];
    limitingEvents: SymptomEvent[];
  };
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
  rankedFindings: DiagnosticPriorityFinding[];
}

export interface DiagnosticPriorityFinding {
  canonical: string;
  displayName: string;
  status: 'weakness' | 'overperforming';
  priorityScore: number;
  confidence: 'high' | 'moderate' | 'limited';
  deviationPercent: number;
  observationCount: number;
  comparisonCount: number;
  staleDays: number;
  agreementCount: number;
  relatedCount: number;
  effects: string[];
}

export function summarizeDiagnosticEvidence(
  variants: DiagnosticVariant[]
): DiagnosticEvidenceSummary {
  let belowCount = 0;
  let aboveCount = 0;
  let leadingBelowEffect: DiagnosticAttentionSummary['leadingBelowEffect'] = null;
  const evidence = new Map<string, { belowCount: number; aboveCount: number }>();
  const variantsByEffect = new Map<string, DiagnosticVariant[]>();
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
      const related = variantsByEffect.get(effect) ?? [];
      related.push(variant);
      variantsByEffect.set(effect, related);
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
  const rankedFindings = variants
    .flatMap<DiagnosticPriorityFinding>((variant) => {
      if (variant.status !== 'weakness' && variant.status !== 'overperforming') {
        return [];
      }
      const related = new Map<string, DiagnosticVariant>();
      for (const effect of variant.effects) {
        for (const peer of variantsByEffect.get(effect) ?? []) {
          if (peer.canonical !== variant.canonical) {
            related.set(peer.canonical, peer);
          }
        }
      }
      let agreementCount = 0;
      for (const peer of related.values()) {
        if (peer.status === variant.status) {
          agreementCount += 1;
        }
      }
      const relatedCount = related.size;
      const agreement = relatedCount ? agreementCount / relatedCount : 0;
      const recency = Math.max(0, 1 - variant.staleDays / 90);
      const sample = Math.min(1, (variant.comparisonCount ?? variant.observationCount) / 4);
      const evidenceQuality = recency * 0.4 + sample * 0.3 + agreement * 0.3;
      const deviationPercent = Math.abs(variant.ratio - 1) * 100;
      return [
        {
          canonical: variant.canonical,
          displayName: variant.displayName,
          status: variant.status,
          priorityScore: Number(
            (
              Math.max(0, deviationPercent - 5) *
              (0.5 + recency * 0.2 + sample * 0.15 + agreement * 0.15)
            ).toFixed(2)
          ),
          confidence:
            evidenceQuality >= 0.75 ? 'high' : evidenceQuality >= 0.45 ? 'moderate' : 'limited',
          deviationPercent,
          observationCount: variant.observationCount,
          comparisonCount: variant.comparisonCount ?? 0,
          staleDays: variant.staleDays,
          agreementCount,
          relatedCount,
          effects: variant.effects,
        },
      ];
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.canonical.localeCompare(b.canonical));
  return {
    belowCount,
    aboveCount,
    leadingBelowEffect,
    effects,
    rankedFindings,
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
    symptomContext: v.symptomContext,
    addlWtOffset: v.addlWtOffset,
  }));

  return liftType ? list.filter((v) => v.lift === `lift:${liftType}`) : list;
}

export function selectUnassessedDiagnostics(
  model: PipelineModel,
  liftType?: string
): UnassessedVariant[] {
  return liftType
    ? model.diagnostics.unassessed.filter((item) => item.lift === `lift:${liftType}`)
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
