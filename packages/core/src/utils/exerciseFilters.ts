import type { ConjugateDataPair } from '../types/conjugate';

export interface FilterState {
  bar: Set<string>;
  stance: Set<string>;
  addlWts: Set<string>;
  equipment: Set<string>;
}

export function emptyFilters(): FilterState {
  return {
    bar: new Set(),
    stance: new Set(),
    addlWts: new Set(),
    equipment: new Set(),
  };
}

export function applyFilters(
  rows: ConjugateDataPair[],
  filters: FilterState,
  excludeVolumeWork = false
): ConjugateDataPair[] {
  return rows.filter(([ex, session]) => {
    if (filters.bar.size > 0 && (ex.bar === null || !filters.bar.has(ex.bar))) {
      return false;
    }
    if (filters.stance.size > 0 && (ex.stance === null || !filters.stance.has(ex.stance))) {
      return false;
    }
    if (filters.addlWts.size > 0 && !ex.addlWts.some((w) => filters.addlWts.has(w))) {
      return false;
    }
    if (
      filters.equipment.size > 0 &&
      (ex.equipment === null || !filters.equipment.has(ex.equipment))
    ) {
      return false;
    }
    if (
      excludeVolumeWork &&
      (ex.type === 'squat' || ex.type === 'bench' || ex.type === 'deadlift') &&
      session.sets > 1
    ) {
      return false;
    }
    return true;
  });
}
