import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { buildAccessoryCoverage, type AccessoryCoverage } from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';

const EMPTY: AccessoryCoverage[] = [];

export function useAccessoryCoverage(dateRange: DateRange): AccessoryCoverage[] {
  const { status, model } = usePipelineModel();
  return useMemo(
    () =>
      status === 'success' && model
        ? buildAccessoryCoverage(model.tagged, dateRange.from, dateRange.to)
        : EMPTY,
    [status, model, dateRange.from, dateRange.to]
  );
}
