import { useMemo } from 'react';
import type { AccessoryTableRow, DisplayUnit } from '@dyel/api';
import { buildAccessoryTableRows, formatLastSessionSummary } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';

export interface AccessoryTableDisplay extends AccessoryTableRow {
  lastPerformedDisplay: string;
}

const EMPTY: AccessoryTableDisplay[] = [];

export function useAccessoryTable(unit: DisplayUnit): AccessoryTableDisplay[] {
  const { status, model } = usePipelineModel();

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }

    const rows = buildAccessoryTableRows(model.tagged);
    return rows.map((row) => ({
      ...row,
      lastPerformedDisplay: formatLastSessionSummary(row.lastSession, unit),
    }));
  }, [status, model, unit]);
}
