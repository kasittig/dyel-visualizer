import { useMemo } from 'react';
import { useLastSessionStats } from '../../hooks/data/useLastSessionStats';
import { useBaselineTargetExercises } from '../../hooks/data/useBaselineTargetExercises';
import { buildChartData } from '@dyel/core';
import type { LiftType } from '@dyel/core';
import { TotalChart } from '../charts/TotalChart';
import { SigmaRadarChart } from '../charts/SigmaRadarChart';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';

export function SigmaTab({
  sigmaPairs,
  effectiveBaselineNames,
  effectiveTargetNames,
}: {
  sigmaPairs: ConjugateDataPair[];
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  effectiveTargetNames: Partial<Record<LiftType, string>>;
}) {
  const sigmaStats = useLastSessionStats(sigmaPairs, effectiveBaselineNames);

  const { baselineExByType, targetExByType } = useBaselineTargetExercises(
    sigmaPairs,
    effectiveBaselineNames,
    effectiveTargetNames
  );

  const chartData = useMemo(
    () => buildChartData(sigmaPairs, baselineExByType, targetExByType, sigmaStats),
    [sigmaPairs, baselineExByType, targetExByType, sigmaStats]
  );

  const unit = sigmaPairs[0]?.[1].unit ?? 'lbs';

  return (
    <>
      <TotalChart chartData={chartData} unit={unit} />
      <SigmaRadarChart chartData={chartData} unit={unit} />
    </>
  );
}
