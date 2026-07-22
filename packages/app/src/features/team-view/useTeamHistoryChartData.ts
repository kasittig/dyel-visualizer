import { useMemo } from 'react';
import {
  buildTeamHistoryChartData,
  type TeamHistoryChartData,
  type DisplayUnit,
  type Point,
} from '@dyel/api';

export function useTeamHistoryChartData(
  pointsByLifter: Map<string, Point[]>,
  unit: DisplayUnit,
  normalizedPointsByLifter?: Map<string, Point[]>
): TeamHistoryChartData {
  return useMemo(
    () => buildTeamHistoryChartData(pointsByLifter, unit, normalizedPointsByLifter),
    [pointsByLifter, unit, normalizedPointsByLifter]
  );
}
