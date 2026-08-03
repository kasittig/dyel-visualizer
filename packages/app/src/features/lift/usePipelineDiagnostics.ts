import { useMemo } from 'react';
import { usePipelineModel } from '../../app/PipelineContext';
import {
  formatAddlWtOffset,
  formatEffect,
  formatWeight,
  convertWeight,
  selectDiagnosticVariants,
  selectUnassessedDiagnostics,
  summarizeEffects,
  type DiagnosticVariant,
  type DisplayUnit,
  type UnassessedVariant,
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
  latestDateDisplay: string;
  trendDisplay: string;
  observationDisplay: string;
  calculationDisplay: string;
  rationaleDisplay: string;
}

export interface DiagnosticNeedRow extends UnassessedVariant {
  reasonDisplay: string;
  actionDisplay: string;
}

export interface DiagnosticResult {
  variants: DiagnosticRow[];
  hasDeadlift: boolean;
  weakEffects: string[];
  overtrainedEffects: string[];
  needsData: DiagnosticNeedRow[];
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
      const trendPercent = variant.previousE1rmKg
        ? (variant.actualE1rmKg / variant.previousE1rmKg - 1) * 100
        : null;
      const baselineOperand = Number(convertWeight(variant.baselineE1rmKg, unit).toFixed(1));
      const factorOperand = Number((variant.expectedFactor * 100).toFixed(1)) / 100;
      const offsetOperand = variant.addlWtOffset
        ? Number(convertWeight(variant.addlWtOffset.offsetKg, unit).toFixed(1))
        : 0;
      const expectedOperand = baselineOperand * factorOperand - offsetOperand;
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
        latestDateDisplay: new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(variant.latestAt),
        trendDisplay:
          trendPercent === null
            ? 'No prior observation'
            : `${trendPercent > 0 ? '+' : ''}${trendPercent.toFixed(1)}% vs prior observation`,
        observationDisplay: `${variant.observationCount} observation${variant.observationCount === 1 ? '' : 's'} · ${variant.comparisonCount === null ? 'no fitted comparison' : `${variant.comparisonCount} fitted comparison${variant.comparisonCount === 1 ? '' : 's'}`}`,
        calculationDisplay: `${baselineOperand.toFixed(1)} ${unit} baseline × ${(factorOperand * 100).toFixed(1)}%${variant.addlWtOffset ? ` − ${offsetOperand.toFixed(1)} ${unit} added resistance` : ''} = ${expectedOperand.toFixed(1)} ${unit} expected`,
        rationaleDisplay:
          variant.status === 'stale'
            ? `The latest observation is ${ageDays} days old, so a retest is needed before interpreting the result.`
            : variant.status === 'optimal'
              ? `The latest e1RM is within 5% of its expected value.`
              : `The latest e1RM is ${Math.abs(deltaPercent).toFixed(1)}% ${variant.status === 'weakness' ? 'below' : 'above'} its expected value.`,
      };
    });
  }, [model, liftType, unit]);

  const needsData = useMemo(() => {
    if (!model) {
      return [];
    }
    return selectUnassessedDiagnostics(model, liftType).map((item) => ({
      ...item,
      ...(item.reason === 'missing-lift'
        ? {
            reasonDisplay: 'Lift not recognized',
            actionDisplay: 'Rename the exercise so it clearly identifies its lift.',
          }
        : item.reason === 'missing-factor'
          ? {
              reasonDisplay: 'Needs comparison history',
              actionDisplay:
                'Log this variation alongside its competition lift to establish an expected relationship.',
            }
          : {
              reasonDisplay: 'Needs competition baseline',
              actionDisplay: 'Log a recent competition-lift set for this lift.',
            }),
    }));
  }, [model, liftType]);

  const hasDeadlift = variants.some((v) => v.lift.includes('deadlift'));
  const { weakEffects, overtrainedEffects } = useMemo(() => {
    return summarizeEffects(variants);
  }, [variants]);

  return { variants, hasDeadlift, weakEffects, overtrainedEffects, needsData };
}
