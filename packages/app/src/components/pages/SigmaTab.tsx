import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EditableDateChip } from '../shared/EditableDateChip';
import { useBaselineTargetExercises } from '../../hooks/data/useBaselineTargetExercises';
import { buildChartData } from '@dyel/core';
import type { ChartPoint, LiftType, SessionStats } from '@dyel/core';
import { TotalChart } from '../charts/TotalChart';
import { SessionBarChart } from '../charts/SessionBarChart';
import { SigmaChart } from '../charts/SigmaChart';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';

export function SigmaTab({
  sigmaPairs,
  sigmaStats,
  volumeByDate,
  effectiveBaselineNames,
  effectiveTargetNames,
  dateRange,
  onDateRangeChange,
  pipelineTotalChartData,
}: {
  sigmaPairs: ConjugateDataPair[];
  sigmaStats: SessionStats;
  volumeByDate: Map<string, number>;
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  effectiveTargetNames: Partial<Record<LiftType, string>>;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  pipelineTotalChartData: ChartPoint[];
}) {
  const { baselineExByType, targetExByType } = useBaselineTargetExercises(
    sigmaPairs,
    effectiveBaselineNames,
    effectiveTargetNames
  );

  const chartData = useMemo(
    () => buildChartData(sigmaPairs, baselineExByType, targetExByType, sigmaStats, volumeByDate),
    [sigmaPairs, baselineExByType, targetExByType, sigmaStats, volumeByDate]
  );

  const unit = sigmaPairs[0]?.[1].unit ?? 'lbs';

  return (
    <>
      <CollapsibleSection
        label="Overview"
        trailing={<EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />}
      >
        <TotalChart chartData={pipelineTotalChartData} unit={unit} />
      </CollapsibleSection>
      <SigmaChart chartData={chartData} unit={unit} />
      <CollapsibleSection label="Total Volume">
        <SessionBarChart chartData={chartData} unit={unit} />
      </CollapsibleSection>
    </>
  );
}
