import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { buildAccessoryHistory, type AccessoryHistoryData, type DisplayUnit } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';

export function useAccessoryHistory(
  exerciseId: string | null,
  unit: DisplayUnit,
  dateRange: DateRange
): AccessoryHistoryData | null {
  const { status, model } = usePipelineModel();

  return useMemo(
    () =>
      status === 'success' && model && exerciseId
        ? buildAccessoryHistory(model.tagged, exerciseId, unit, dateRange.from, dateRange.to)
        : null,
    [status, model, exerciseId, unit, dateRange.from, dateRange.to]
  );
}
