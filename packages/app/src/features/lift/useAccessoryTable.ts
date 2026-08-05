import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { usePipelineModel } from '../../app/PipelineContext';
import {
  buildAccessoryTableRows,
  formatLastSessionParts,
  formatLastSessionSummary,
  formatWeight,
  roundWeight,
  type AccessoryTableRow,
  type AccessoryCategory,
  type DisplayUnit,
} from '@dyel/api';

export interface AccessoryTableDisplay extends AccessoryTableRow {
  lastPerformedDisplay: string;
  progressDisplay: string;
  progressDetailDisplay: string;
  classificationDisplay: string;
}
export interface AccessoryTableGroup {
  category: AccessoryCategory | null;
  label: string;
  rows: AccessoryTableDisplay[];
}

const EMPTY: AccessoryTableGroup[] = [];
export const ACCESSORY_CATEGORY_LABELS: Record<AccessoryCategory, string> = {
  'upper-push': 'Upper push',
  'upper-pull': 'Upper pull',
  triceps: 'Triceps',
  biceps: 'Biceps',
  shoulders: 'Shoulders',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  'low-back': 'Low back',
  core: 'Core',
  carries: 'Carries',
  conditioning: 'Conditioning',
};
const CATEGORY_ORDER: (AccessoryCategory | null)[] = [
  'upper-push',
  'upper-pull',
  'triceps',
  'biceps',
  'shoulders',
  'quads',
  'hamstrings',
  'glutes',
  'low-back',
  'core',
  'carries',
  'conditioning',
  null,
];

const STATUS_LABEL: Record<AccessoryTableRow['progress']['status'], string> = {
  new: 'New',
  progressing: 'Progressing',
  flat: 'Flat',
  regressing: 'Regressing',
  stale: 'Stale',
  'insufficient-history': 'More history needed',
};

export function formatAccessoryProgress(
  row: AccessoryTableRow,
  unit: DisplayUnit
): {
  summary: string;
  detail: string;
} {
  const { progress } = row;
  const previous = progress.previous
    ? `vs ${formatLastSessionParts(progress.previous, unit).date}`
    : progress.status === 'new'
      ? 'first session'
      : 'no comparable session';
  const best = progress.best ? `best ${formatWeight(progress.best.weight, unit)}` : null;
  const detail = [previous, best].filter(Boolean).join(' · ');
  const volume = progress.change?.volume;
  if (volume) {
    return {
      summary: `${STATUS_LABEL[progress.status]} · ${volume > 0 ? '+' : ''}${roundWeight(volume, unit)} ${unit}-reps`,
      detail,
    };
  }
  const reps = progress.change?.reps;
  if (reps) {
    return {
      summary: `${STATUS_LABEL[progress.status]} · ${reps > 0 ? '+' : ''}${reps} reps`,
      detail,
    };
  }
  return {
    summary:
      progress.status === 'stale'
        ? `Stale · ${progress.daysSinceLastPerformed}d ago`
        : STATUS_LABEL[progress.status],
    detail,
  };
}

export function useAccessoryTable(unit: DisplayUnit, dateRange?: DateRange): AccessoryTableGroup[] {
  const { status, model } = usePipelineModel();

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }

    const rows = buildAccessoryTableRows(model.tagged, dateRange?.from, dateRange?.to).map(
      (row) => {
        const progress = formatAccessoryProgress(row, unit);
        return {
          ...row,
          lastPerformedDisplay: formatLastSessionSummary(row.lastSession, unit),
          progressDisplay: progress.summary,
          progressDetailDisplay: progress.detail,
          classificationDisplay:
            row.classification.source === 'unclassified'
              ? 'Unclassified'
              : `${row.classification.source === 'user' ? 'User mapping' : row.classification.source === 'legacy-tag' ? 'Legacy fallback' : 'Name match'} · ${row.classification.confidence} confidence`,
        };
      }
    );

    const grouped = Map.groupBy(rows, (row) => row.category);

    return CATEGORY_ORDER.reduce<AccessoryTableGroup[]>((acc, category) => {
      const match = grouped.get(category);
      if (match?.length) {
        acc.push({
          category,
          label: category ? ACCESSORY_CATEGORY_LABELS[category] : 'Unclassified',
          rows: match,
        });
      }
      return acc;
    }, []);
  }, [status, model, unit, dateRange?.from, dateRange?.to]);
}
