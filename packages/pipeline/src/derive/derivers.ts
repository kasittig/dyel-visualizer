import type { TaggedSetRecord } from '../tag/tag';

export interface SeriesDeriver {
  id: string;
  derive(daySets: TaggedSetRecord[]): number;
}

// Epley formula with special case for reps <= 1
function calcE1RM(weight: number, reps: number): number {
  if (reps <= 1) {
    return weight;
  }
  return weight * (1 + reps / 30);
}

// E1RM deriver: best (max) e1rm over the day's sets
const e1rmDeriver: SeriesDeriver = {
  id: 'e1rm',
  derive(daySets: TaggedSetRecord[]): number {
    if (daySets.length === 0) {
      return 0;
    }
    const e1rms = daySets.map((s) => calcE1RM(s.weight, s.reps));
    return Math.max(...e1rms);
  },
};

// Tonnage deriver: sum of weight * reps over all sets
const tonnageDeriver: SeriesDeriver = {
  id: 'tonnage',
  derive(daySets: TaggedSetRecord[]): number {
    return daySets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  },
};

// Top-set deriver: max weight over the day's sets
const topSetDeriver: SeriesDeriver = {
  id: 'top-set',
  derive(daySets: TaggedSetRecord[]): number {
    if (daySets.length === 0) {
      return 0;
    }
    return Math.max(...daySets.map((s) => s.weight));
  },
};

// Registry of all derivers for lookup by id
export const derivers: Record<string, SeriesDeriver> = {
  e1rm: e1rmDeriver,
  tonnage: tonnageDeriver,
  'top-set': topSetDeriver,
};
