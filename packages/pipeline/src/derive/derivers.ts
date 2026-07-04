import type { TaggedSetRecord } from '../tag/tag';

export interface SeriesDeriver {
  id: string;
  derive(daySets: TaggedSetRecord[]): number;
}

const calcE1RM = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));

export const derivers: Record<string, SeriesDeriver> = {
  e1rm: {
    id: 'e1rm',
    derive: (sets) => (sets.length ? Math.max(...sets.map((s) => calcE1RM(s.weight, s.reps))) : 0),
  },
  tonnage: {
    id: 'tonnage',
    derive: (sets) => sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
  },
  'top-set': {
    id: 'top-set',
    derive: (sets) => (sets.length ? Math.max(...sets.map((s) => s.weight)) : 0),
  },
};
