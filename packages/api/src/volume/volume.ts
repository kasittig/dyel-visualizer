import type { ConjugateDataPair } from '@dyel/core';
import { localDateKey } from '@dyel/core';

export function calculateVolumeCorrelation(pairs: ConjugateDataPair[]): Map<string, number> {
  const volumeByDate = new Map<string, number>();
  for (const [, session] of pairs) {
    const key = localDateKey(session.date);
    const tonnage = session.sets * session.reps * session.weight;
    volumeByDate.set(key, (volumeByDate.get(key) ?? 0) + tonnage);
  }
  return volumeByDate;
}
