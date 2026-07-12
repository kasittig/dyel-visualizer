import type { Unit } from '../types';

export const convertToKg = (w: number, u: Unit) => {
  return u === 'lbs' ? w * 0.453592 : w;
};
