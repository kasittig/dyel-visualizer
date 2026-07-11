import { useMemo } from 'react';
import { computeStrengthScores, getCompetitionTotal, strengthTierForPercentile } from '@dyel/api';
import type { DateRange } from 'react-day-picker';
import { usePipelineModel } from '../../app/PipelineContext';

export interface StrengthScoresResult {
  competitionTotal: number | null;
  scores: ReturnType<typeof computeStrengthScores> | null;
}

/**
 * Hook to compute strength scores (Wilks, DOTS, Schwartz-Malone) from a bodyweight
 * and the most recent competition total in the pipeline model.
 *
 * @param bodyweight User-entered bodyweight (empty string if not yet input)
 * @param unit Display unit for bodyweight ('lbs' | 'kg')
 * @param gender Athlete gender ('male' | 'female')
 * @param dateRange Date range to scope the competition total lookup
 * @param dataUnit Unit used in the pipeline data (for getCompetitionTotal)
 * @returns Object with competitionTotal and scores (both null if invalid inputs)
 */
export function useStrengthScores(
  bodyweight: string,
  unit: 'lbs' | 'kg',
  gender: 'male' | 'female',
  dateRange: DateRange,
  dataUnit: 'lbs' | 'kg'
): StrengthScoresResult {
  const { model } = usePipelineModel();

  const bodyweightNum = parseFloat(bodyweight);

  const competitionTotal = useMemo(() => {
    if (model === null) {
      return null;
    }
    return getCompetitionTotal(model, dateRange, dataUnit);
  }, [model, dateRange, dataUnit]);

  const scores = useMemo(() => {
    if (competitionTotal === null || !bodyweight || bodyweightNum <= 0 || isNaN(bodyweightNum)) {
      return null;
    }
    const computed = computeStrengthScores(
      bodyweightNum,
      competitionTotal,
      gender === 'female',
      unit
    );
    return {
      ...computed,
      wilksTier:
        computed.wilksPercentile !== null
          ? strengthTierForPercentile(computed.wilksPercentile)
          : null,
      dotsTier:
        computed.dotsPercentile !== null
          ? strengthTierForPercentile(computed.dotsPercentile)
          : null,
      schwartzmaloneTier:
        computed.schwartzmalone !== null && computed.schwartzmalonePercentile !== null
          ? strengthTierForPercentile(computed.schwartzmalonePercentile)
          : null,
    };
  }, [competitionTotal, bodyweight, bodyweightNum, unit, gender]);

  return { competitionTotal, scores };
}
