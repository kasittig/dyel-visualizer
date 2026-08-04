import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { usePipelineModel } from '../../app/PipelineContext';
import {
  buildAccessoryTableRows,
  formatEffect,
  formatLastSessionParts,
  formatLastSessionSummary,
  formatWeight,
  roundWeight,
  type AccessoryTableRow,
  type AccessorySubtype,
  type DisplayUnit,
} from '@dyel/api';

export interface AccessoryTableDisplay extends AccessoryTableRow {
  lastPerformedDisplay: string;
  effectsDisplay: string;
  progressDisplay: string;
  progressDetailDisplay: string;
}
export interface AccessoryTableGroup {
  subtype: AccessorySubtype;
  label: string;
  rows: AccessoryTableDisplay[];
}

const EMPTY: AccessoryTableGroup[] = [];
const SUBTYPE_MAP: Record<string, string> = {
  upper: 'Upper',
  lower: 'Lower',
  core: 'Core',
  null: 'Unclassified',
};
const SUBTYPE_ORDER: AccessorySubtype[] = ['upper', 'lower', 'core', null];

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
          effectsDisplay: row.effects.length ? row.effects.map(formatEffect).join(', ') : '—',
          progressDisplay: progress.summary,
          progressDetailDisplay: progress.detail,
        };
      }
    );

    const grouped = Map.groupBy(rows, (row) => row.subtype);

    return SUBTYPE_ORDER.reduce<AccessoryTableGroup[]>((acc, subtype) => {
      const match = grouped.get(subtype);
      if (match?.length) {
        acc.push({ subtype, label: SUBTYPE_MAP[String(subtype)], rows: match });
      }
      return acc;
    }, []);
  }, [status, model, unit, dateRange?.from, dateRange?.to]);
}
