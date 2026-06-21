import { useMemo } from 'react';
import type { ConjugateExercise } from '@dyel/core';
import type { ConjugateDataPair } from '../conjugate/useConjugateData';

export function useBaselineTargetExercises(
  pairs: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  targetNames: Partial<Record<string, string>>
): {
  baselineExByType: Map<string, ConjugateExercise>;
  targetExByType: Map<string, ConjugateExercise>;
} {
  return useMemo(() => {
    const baselineExByType = new Map<string, ConjugateExercise>();
    const targetExByType = new Map<string, ConjugateExercise>();
    for (const [ex] of pairs) {
      if (ex.type === 'accessory') {
        continue;
      }
      const bName = baselineNames[ex.type];
      if (bName && ex.displayName === bName && !baselineExByType.has(ex.type)) {
        baselineExByType.set(ex.type, ex);
      }
      const tName = targetNames[ex.type];
      if (tName && ex.displayName === tName && !targetExByType.has(ex.type)) {
        targetExByType.set(ex.type, ex);
      }
    }
    return { baselineExByType, targetExByType };
  }, [pairs, baselineNames, targetNames]);
}
