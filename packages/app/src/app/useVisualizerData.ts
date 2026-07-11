import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import type { PipelineModel, LiftType } from '@dyel/api';
import {
  groupByLiftType,
  defaultCanonicalsByLift,
  visibleLiftTypes,
  detectDataUnit,
  collectVolumeRecords,
  calculateVolumeCorrelationFromTagged,
  collectSessionDates,
} from '@dyel/api';
import type { SplitRows } from '@dyel/api';

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
  const tabRows = useMemo(() => {
    const tagged = model?.tagged ?? [];
    return groupByLiftType(tagged);
  }, [model]);

  const canonicals = useMemo(() => {
    return defaultCanonicalsByLift(tabRows, deadliftStance);
  }, [tabRows, deadliftStance]);

  const visibleLiftIds = useMemo(() => {
    const visible = visibleLiftTypes(tabRows, dateRange?.from, dateRange?.to);
    return new Set(visible);
  }, [tabRows, dateRange]);

  const volumeRecords = useMemo(() => {
    return collectVolumeRecords(tabRows);
  }, [tabRows]);

  const dataUnit = useMemo(() => {
    return detectDataUnit(tabRows);
  }, [tabRows]);

  const volumeByDate = useMemo(() => {
    return calculateVolumeCorrelationFromTagged(volumeRecords, dataUnit);
  }, [volumeRecords, dataUnit]);

  const { allSessionDates, lastSessionDate } = useMemo(() => {
    return collectSessionDates(tabRows);
  }, [tabRows]);

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
