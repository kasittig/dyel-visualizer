import { useMemo } from 'react';
import { buildSessionStats } from '@dyel/core';
import type { SessionStats } from '@dyel/core';
import type { ConjugateDataPair } from '../conjugate/useConjugateData';

export type { SessionStats };

export function useLastSessionStats(
  pairs: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>> = {},
  today?: Date
): SessionStats {
  const resolvedToday = useMemo(() => today ?? new Date(), [today]);
  return useMemo(
    () => buildSessionStats(pairs, baselineNames, resolvedToday),
    [pairs, baselineNames, resolvedToday]
  );
}
