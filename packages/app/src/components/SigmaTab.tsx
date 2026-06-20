import { useMemo } from 'react';
import { useLastSessionStats } from '../hooks/useLastSessionStats';
import { useBaselineTargetExercises } from '../hooks/useBaselineTargetExercises';
import { buildChartData } from '@dyel/core';
import type { LiftType } from '@dyel/core';
import { TotalChart } from './TotalChart';
import { SigmaRadarChart } from './SigmaRadarChart';
import type { ConjugateDataPair } from '../hooks/useConjugateData';

export function SigmaTab({
  pairs,
  effectiveBaselineNames,
  effectiveTargetNames,
}: {
  pairs: ConjugateDataPair[];
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  effectiveTargetNames: Partial<Record<LiftType, string>>;
}) {
  const sigmaPairs = useMemo(() => pairs.filter(([, session]) => session.sets <= 1), [pairs]);

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
