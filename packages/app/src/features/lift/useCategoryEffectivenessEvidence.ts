import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import {
  associateCategoryExposureWithLaterWeakness,
  buildWeeklyAccessoryCategoryExposure,
  deriveHistoricalWeaknessTrends,
  formatEffect,
  type AccessoryCategory,
  type CategoryEffectivenessStatus,
} from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';
import { ACCESSORY_CATEGORY_LABELS } from './useAccessoryTable';

export interface CategoryEffectivenessRow {
  id: string;
  category: AccessoryCategory;
  categoryLabel: string;
  qualityLabel: string;
  status: CategoryEffectivenessStatus;
  statusLabel: string;
  exposurePeriod: string;
  outcomePeriod: string;
  sessionSummary: string;
  baselineDisplay: string;
  outcomeDisplay: string;
  changeDisplay: string;
  evidenceSummary: string;
  interpretation: string;
  resultSummary: string;
  sourceRows: { name: string; inBaseline: boolean; inOutcome: boolean }[];
  requirementDisplay: string | null;
}

export interface CategoryEffectivenessView {
  windowPolicy: string;
  unavailableReason: string | null;
  rows: CategoryEffectivenessRow[];
}

const STATUS_LABELS: Record<CategoryEffectivenessStatus, string> = {
  'insufficient-data': 'Insufficient data',
  'possible-improvement': 'Possible improvement',
  'no-clear-change': 'No clear change',
  'possible-worsening': 'Possible worsening',
};
const REQUIREMENT_LIST = new Intl.ListFormat('en-US', {
  style: 'long',
  type: 'conjunction',
});
const EMPTY: CategoryEffectivenessView = {
  windowPolicy:
    'Choose a start and end date to compare an earlier exposure period with a later follow-up.',
  unavailableReason: 'A complete selected date range is required.',
  rows: [],
};
const formatPeriod = (start: number, end: number) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatter.format(start)}–${formatter.format(end - 1)}`;
};

export function useCategoryEffectivenessEvidence(dateRange: DateRange): CategoryEffectivenessView {
  const { status, model } = usePipelineModel();

  return useMemo(() => {
    if (status !== 'success' || !model || !dateRange.from || !dateRange.to) {
      return EMPTY;
    }
    const start = Date.UTC(
      dateRange.from.getFullYear(),
      dateRange.from.getMonth(),
      dateRange.from.getDate()
    );
    const end =
      Date.UTC(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate()) +
      86_400_000;
    const dayCount = Math.round((end - start) / 86_400_000);
    if (dayCount < 2) {
      return {
        ...EMPTY,
        unavailableReason: 'Select at least two calendar days to create separate periods.',
      };
    }
    const outcomeStart = start + Math.floor(dayCount / 2) * 86_400_000;
    const window = {
      exposure: { start, end: outcomeStart },
      outcome: { start: outcomeStart, end },
    };
    const evidence = associateCategoryExposureWithLaterWeakness(
      buildWeeklyAccessoryCategoryExposure(model.tagged),
      deriveHistoricalWeaknessTrends(model),
      window
    );
    const displayNameByCanonical = new Map(
      model.tagged.map((record) => [
        record.canonical,
        record.meta?.rawExercise ?? record.canonical.replaceAll('-', ' '),
      ])
    );
    return {
      windowPolicy: `The selected range is split into an earlier exposure period (${formatPeriod(start, outcomeStart)}) and a later follow-up (${formatPeriod(outcomeStart, end)}).`,
      unavailableReason: evidence.length
        ? null
        : 'No related category and lift-quality history is available for these periods.',
      rows: evidence.map((item) => {
        const missingRequirements = [
          item.sessionCount === 0 ? '1 category session in the earlier period' : null,
          item.baselineNormalizedResult === null
            ? '1 usable lift observation in the earlier period'
            : null,
          item.outcomeNormalizedResult === null
            ? '1 usable lift observation in the later follow-up'
            : null,
        ].filter((requirement): requirement is string => requirement !== null);
        const baselineDisplay =
          item.baselineNormalizedResult === null
            ? 'Not available'
            : `${(item.baselineNormalizedResult * 100).toFixed(1)}% of expected`;
        const outcomeDisplay =
          item.outcomeNormalizedResult === null
            ? 'Not available'
            : `${(item.outcomeNormalizedResult * 100).toFixed(1)}% of expected`;
        const changeDisplay =
          item.weaknessChange === null
            ? 'Not available'
            : `${item.weaknessChange > 0 ? '+' : ''}${(item.weaknessChange * 100).toFixed(1)} percentage points`;
        const baselineCanonicals = new Set(item.baselineVariations);
        const outcomeCanonicals = new Set(item.outcomeVariations);
        const sourceRows = Array.from(
          new Set([...item.baselineVariations, ...item.outcomeVariations]),
          (canonical) => ({
            name: displayNameByCanonical.get(canonical) ?? canonical.replaceAll('-', ' '),
            inBaseline: baselineCanonicals.has(canonical),
            inOutcome: outcomeCanonicals.has(canonical),
          })
        ).sort((a, b) => a.name.localeCompare(b.name));
        return {
          id: `${item.category}:${item.quality}`,
          category: item.category,
          categoryLabel: ACCESSORY_CATEGORY_LABELS[item.category],
          qualityLabel: formatEffect(item.quality),
          status: item.status,
          statusLabel: STATUS_LABELS[item.status],
          exposurePeriod: formatPeriod(item.exposurePeriod.start, item.exposurePeriod.end),
          outcomePeriod: formatPeriod(item.outcomePeriod.start, item.outcomePeriod.end),
          sessionSummary: `${item.sessionCount} session${item.sessionCount === 1 ? '' : 's'} across ${item.exposureWeekCount} week${item.exposureWeekCount === 1 ? '' : 's'}${item.exposureWeekCount ? ` · ${(item.sessionCount / item.exposureWeekCount).toFixed(1)} per week` : ''}`,
          baselineDisplay,
          outcomeDisplay,
          changeDisplay,
          evidenceSummary: `${item.observationCount} follow-up observation${item.observationCount === 1 ? '' : 's'} · ${item.evidenceCount} contributing lift signal${item.evidenceCount === 1 ? '' : 's'} (${item.baselineEvidenceCount} baseline, ${item.outcomeEvidenceCount} follow-up)`,
          interpretation: item.interpretation,
          resultSummary:
            item.weaknessChange === null
              ? 'There is not enough category and lift-quality history to compare the two periods.'
              : `${item.sessionCount} ${ACCESSORY_CATEGORY_LABELS[item.category].toLowerCase()} session${item.sessionCount === 1 ? '' : 's'} from ${formatPeriod(item.exposurePeriod.start, item.exposurePeriod.end)} were followed by ${item.weaknessChange > 0 ? 'stronger' : item.weaknessChange < 0 ? 'weaker' : 'unchanged'} ${formatEffect(item.quality).toLowerCase()}-linked performance from ${formatPeriod(item.outcomePeriod.start, item.outcomePeriod.end)}: ${baselineDisplay} → ${outcomeDisplay} (${changeDisplay}).`,
          sourceRows,
          requirementDisplay: missingRequirements.length
            ? `Needed: ${REQUIREMENT_LIST.format(missingRequirements)}.`
            : null,
        };
      }),
    };
  }, [status, model, dateRange.from, dateRange.to]);
}
