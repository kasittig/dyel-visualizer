import { useMemo } from 'react';
import { computeStrengthScores, getCompetitionTotal, strengthTierForPercentile } from '@dyel/api';
import type { DateRange } from 'react-day-picker';
import { usePipelineModel } from '../../app/PipelineContext';

export interface StrengthScoresResult {
  competitionTotal: number | null;
  scores: ReturnType<typeof computeStrengthScores> | null;
}

export function useStrengthScores(
  bodyweight: string,
  unit: 'lbs' | 'kg',
  gender: 'male' | 'female',
  dateRange: DateRange,
  dataUnit: 'lbs' | 'kg'
): StrengthScoresResult {
  const { model } = usePipelineModel();
  const bwNum = parseFloat(bodyweight);

  const competitionTotal = useMemo(() => {
    if (model === null) {
      return null;
    }
    return getCompetitionTotal(model, dateRange, dataUnit);
  }, [model, dateRange, dataUnit]);

  const scores = useMemo(() => {
    if (competitionTotal === null || !bodyweight || bwNum <= 0 || isNaN(bwNum)) {
      return null;
    }
    const res = computeStrengthScores(bwNum, competitionTotal, gender === 'female', unit);
    return {
      ...res,
      wilksTier:
        res.wilksPercentile !== null ? strengthTierForPercentile(res.wilksPercentile) : null,
      dotsTier: res.dotsPercentile !== null ? strengthTierForPercentile(res.dotsPercentile) : null,
      schwartzmaloneTier:
        res.schwartzmalone !== null && res.schwartzmalonePercentile !== null
          ? strengthTierForPercentile(res.schwartzmalonePercentile)
          : null,
    };
  }, [competitionTotal, bodyweight, bwNum, unit, gender]);

  return { competitionTotal, scores };
}
