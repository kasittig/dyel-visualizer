import { useMemo } from 'react';
import type { AccessoryTableRow, AccessorySubtype, DisplayUnit } from '@dyel/api';
import { buildAccessoryTableRows, formatLastSessionSummary } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';

export interface AccessoryTableDisplay extends AccessoryTableRow {
  lastPerformedDisplay: string;
}

export interface AccessoryTableGroup {
  subtype: AccessorySubtype;
  label: string;
  rows: AccessoryTableDisplay[];
}

const EMPTY: AccessoryTableGroup[] = [];

const getSubtypeLabel = (subtype: AccessorySubtype): string => {
  switch (subtype) {
    case 'upper':
      return 'Upper';
    case 'lower':
      return 'Lower';
    case 'core':
      return 'Core';
    case null:
      return 'Unclassified';
  }
};

const SUBTYPE_ORDER: AccessorySubtype[] = ['upper', 'lower', 'core', null];

export function useAccessoryTable(unit: DisplayUnit): AccessoryTableGroup[] {
  const { status, model } = usePipelineModel();

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }

    const rows = buildAccessoryTableRows(model.tagged).map((row) => ({
      ...row,
      lastPerformedDisplay: formatLastSessionSummary(row.lastSession, unit),
    }));

    // Group rows by subtype using Map.groupBy
    const groupedBySubtype = Map.groupBy(rows, (row) => row.subtype);

    // Build ordered groups, filtering out empty ones
    const groups: AccessoryTableGroup[] = [];
    for (const subtype of SUBTYPE_ORDER) {
      const groupRows = groupedBySubtype.get(subtype);
      if (groupRows && groupRows.length > 0) {
        groups.push({
          subtype,
          label: getSubtypeLabel(subtype),
          rows: groupRows,
        });
      }
    }

    return groups;
  }, [status, model, unit]);
}
