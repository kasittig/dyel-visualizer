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
  baselineCanonicals: Partial<Record<LiftType, string>>;
  targetCanonicals: Partial<Record<LiftType, string>>;
  dataUnit: 'lbs' | 'kg';
  volumeByDate: Map<string, number>;
  allSessionDates: Date[];
  lastSessionDate: Date | null;
}

export function useVisualizerData(
  model: PipelineModel | null,
  dateRange: DateRange,
  deadliftStance: string
): VisualizerData {
  const tabRows = useMemo(() => groupByLiftType(model?.tagged ?? []), [model]);
  const canonicals = useMemo(
    () => defaultCanonicalsByLift(tabRows, deadliftStance),
    [tabRows, deadliftStance]
  );
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
    baselineCanonicals: canonicals,
    targetCanonicals: canonicals,
    dataUnit,
    volumeByDate,
    allSessionDates,
    lastSessionDate,
  };
}
