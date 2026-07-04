import type { TaggedSetRecord } from '../tag/tag';
import { calcE1RM } from './e1rm';

export interface SeriesDeriver {
  id: string;
  derive(daySets: TaggedSetRecord[]): number;
}

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
