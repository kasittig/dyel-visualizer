export type DisplayUnit = 'lbs' | 'kg';

// Pipeline output is always kg; display-unit conversion is the app's job (see
// packages/pipeline/src/dataset/CLAUDE.md). This is the single source of truth for
// kg -> display-unit conversion — do not reintroduce local KG_TO_LBS constants elsewhere.
export const KG_TO_LBS = 2.20462262185;

export function convertWeight(kg: number, unit: DisplayUnit): number {
  return unit === 'lbs' ? kg * KG_TO_LBS : kg;
}

export function convertWeightUnit(value: number, from: DisplayUnit, to: DisplayUnit): number {
  return from === to ? value : from === 'kg' ? value * KG_TO_LBS : value / KG_TO_LBS;
}

export function roundWeight(kg: number, unit: DisplayUnit): number {
  return Math.round(convertWeight(kg, unit));
}

export function formatWeight(kg: number, unit: DisplayUnit, decimals = 0): string {
  const converted = convertWeight(kg, unit);
  return `${decimals > 0 ? converted.toFixed(decimals) : Math.round(converted)} ${unit}`;
}
