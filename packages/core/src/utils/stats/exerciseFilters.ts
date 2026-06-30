import type { ConjugateDataPair } from '../../types/conjugate';

export function filterByDateRange(
  rows: ConjugateDataPair[],
  from: Date | undefined,
  to: Date | undefined
): ConjugateDataPair[] {
  if (!from && !to) {
    return rows;
  }
  const dayStart = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : null;
  const dayEnd = to
    ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)
    : null;
  return rows.filter(([, session]) => {
    if (dayStart && session.date < dayStart) {
      return false;
    }
    if (dayEnd && session.date > dayEnd) {
      return false;
    }
    return true;
  });
}
