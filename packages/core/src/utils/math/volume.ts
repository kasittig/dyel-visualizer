import type { ConjugateDataPair } from '../../types/conjugate';

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateVolumeCorrelation(pairs: ConjugateDataPair[]): Map<string, number> {
  const volumeByDate = new Map<string, number>();
  for (const [, session] of pairs) {
    const key = localDateKey(session.date);
    const tonnage = session.sets * session.reps * session.weight;
    volumeByDate.set(key, (volumeByDate.get(key) ?? 0) + tonnage);
  }
  return volumeByDate;
}
