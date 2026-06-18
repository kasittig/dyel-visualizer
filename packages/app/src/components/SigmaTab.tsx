import { useMemo } from 'react';
import { useLastSessionStats } from '../hooks/useLastSessionStats';
import { useBaselineTargetExercises } from '../hooks/useBaselineTargetExercises';
import { buildChartData } from '@dyel/core';
import { TotalChart } from './TotalChart';
import { SigmaRadarChart } from './SigmaRadarChart';
import type { ConjugateDataPair } from '../hooks/useConjugateData';
import type { LiftType } from '../utils/appUtils';

export function SigmaTab({
  pairs,
  excludeVolumeWork,
  effectiveBaselineNames,
  effectiveTargetNames,
}: {
  pairs: ConjugateDataPair[];
  excludeVolumeWork: boolean;
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  effectiveTargetNames: Partial<Record<LiftType, string>>;
}) {
  const sigmaPairs = useMemo(
    () =>
      excludeVolumeWork
        ? pairs.filter(([ex, session]) => ex.type === 'accessory' || session.sets <= 1)
        : pairs,
    [pairs, excludeVolumeWork]
  );

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
