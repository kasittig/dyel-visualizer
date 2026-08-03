import { useMemo } from 'react';
import { usePipelineModel } from '../../app/PipelineContext';
import {
  formatAddlWtOffset,
  formatEffect,
  formatWeight,
  selectDiagnosticVariants,
  summarizeEffects,
  type DiagnosticVariant,
  type DisplayUnit,
} from '@dyel/api';

export type { DiagnosticVariant } from '@dyel/api';

export interface DiagnosticRow extends DiagnosticVariant {
  effectsDisplay: string;
  actualE1rmDisplay: string;
  expectedE1rmDisplay: string;
  deltaPercent: number;
  deltaDisplay: string;
  ageDays: number;
  ageDisplay: string;
}

export interface DiagnosticResult {
  variants: DiagnosticRow[];
  hasDeadlift: boolean;
  weakEffects: string[];
  overtrainedEffects: string[];
}

export function usePipelineDiagnostics(
  liftType?: string,
  unit: DisplayUnit = 'lbs'
): DiagnosticResult {
  const { model } = usePipelineModel();

  const variants = useMemo(() => {
    if (!model) {
      return [];
    }

    return selectDiagnosticVariants(model, liftType).map((variant) => {
      const deltaPercent = (variant.ratio - 1) * 100;
      const ageDays = Math.floor(variant.staleDays);
      const effectsDisplay = [
        ...variant.effects.map(formatEffect),
        ...(variant.addlWtOffset ? [formatAddlWtOffset(variant.addlWtOffset.offsetKg, unit)] : []),
      ].join(', ');
      return {
        ...variant,
        effectsDisplay: effectsDisplay || '—',
        actualE1rmDisplay: formatWeight(variant.actualE1rmKg, unit),
        expectedE1rmDisplay: formatWeight(variant.expectedE1rmKg, unit),
        deltaPercent,
        deltaDisplay: `${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`,
        ageDays,
        ageDisplay: ageDays === 0 ? 'Today' : ageDays === 1 ? '1 day ago' : `${ageDays} days ago`,
      };
    });
  }, [model, liftType, unit]);

  const hasDeadlift = variants.some((v) => v.lift.includes('deadlift'));
  const { weakEffects, overtrainedEffects } = useMemo(() => {
    return summarizeEffects(variants);
  }, [variants]);

  return { variants, hasDeadlift, weakEffects, overtrainedEffects };
}
