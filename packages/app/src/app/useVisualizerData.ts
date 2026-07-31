import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { PipelineModel, LiftType, SplitRows } from '@dyel/api';
import {
  groupByLiftType,
  defaultCanonicalsByLift,
  visibleLiftTypes,
  detectDataUnit,
  collectVolumeRecords,
  calculateVolumeCorrelationFromTagged,
  collectSessionDates,
} from '@dyel/api';

export interface VisualizerData {
  tabRows: Record<LiftType, SplitRows>;
  visibleLiftIds: Set<LiftType>;
  defaultCanonicals: Partial<Record<LiftType, string>>;
  dataUnit: 'lbs' | 'kg';
  volumeByDate: Map<string, number>;
  allSessionDates: Date[];
  lastSessionDate: Date | null;
}

export function useVisualizerData(
  model: PipelineModel | null,
  dateRange: DateRange
): VisualizerData {
  const tabRows = useMemo(() => groupByLiftType(model?.tagged ?? []), [model]);
  const canonicals = useMemo(() => defaultCanonicalsByLift(tabRows), [tabRows]);
  const visibleLiftIds = useMemo(
    () => new Set(visibleLiftTypes(tabRows, dateRange?.from, dateRange?.to)),
    [tabRows, dateRange?.from, dateRange?.to]
  );
  const volumeRecords = useMemo(() => collectVolumeRecords(tabRows), [tabRows]);
  const dataUnit = useMemo(() => detectDataUnit(tabRows), [tabRows]);
  const volumeByDate = useMemo(
    () => calculateVolumeCorrelationFromTagged(volumeRecords, dataUnit),
    [volumeRecords, dataUnit]
  );
  const { allSessionDates, lastSessionDate } = useMemo(
    () => collectSessionDates(tabRows),
    [tabRows]
  );

  return {
    tabRows,
    visibleLiftIds,
    defaultCanonicals: canonicals,
    dataUnit,
    volumeByDate,
    allSessionDates,
    lastSessionDate,
  };
}
