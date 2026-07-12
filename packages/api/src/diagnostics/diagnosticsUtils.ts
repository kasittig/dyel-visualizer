import { convertWeight, type DisplayUnit } from '../weightUnit';

export function formatEffect(effect: string): string {
  return effect
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAddlWtOffset(offsetKg: number, unit: DisplayUnit): string {
  const v = convertWeight(offsetKg, unit);
  return `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1)}${unit}`;
}
