import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { usePipelineModel } from '../../app/PipelineContext';
import {
  buildAccessoryTableRows,
  formatLastSessionSummary,
  type AccessoryTableRow,
  type AccessorySubtype,
  type DisplayUnit,
} from '@dyel/api';

export interface AccessoryTableDisplay extends AccessoryTableRow {
  lastPerformedDisplay: string;
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

export function useAccessoryTable(unit: DisplayUnit, dateRange?: DateRange): AccessoryTableGroup[] {
  const { status, model } = usePipelineModel();

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }

    const rows = buildAccessoryTableRows(model.tagged, dateRange?.from, dateRange?.to).map(
      (row) => ({
        ...row,
        lastPerformedDisplay: formatLastSessionSummary(row.lastSession, unit),
      })
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
