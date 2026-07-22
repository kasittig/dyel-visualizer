import { useMemo } from 'react';
import {
  buildTeamHistoryChartData,
  type TeamHistoryChartData,
  type DisplayUnit,
  type Point,
} from '@dyel/api';

export function useTeamHistoryChartData(
  pointsByLifter: Map<string, Point[]>,
  unit: DisplayUnit
): TeamHistoryChartData {
  return useMemo(() => buildTeamHistoryChartData(pointsByLifter, unit), [pointsByLifter, unit]);
}
