import { describe, it, expect } from 'vitest';
import { convertWeight, roundWeight, formatWeight } from './weightUnit';

describe('convertWeight', () => {
  const KG_TO_LBS = 2.20462262185;

  it.each([
    ['kg passthrough (zero)', 0, 'kg', 0],
    ['kg passthrough (positive)', 100, 'kg', 100],
    ['kg passthrough (negative)', -50, 'kg', -50],
    ['kg passthrough (fractional)', 50.5, 'kg', 50.5],
    ['lbs conversion (zero)', 0, 'lbs', 0],
    ['lbs conversion (positive)', 100, 'lbs', 100 * KG_TO_LBS],
    ['lbs conversion (negative)', -50, 'lbs', -50 * KG_TO_LBS],
    ['lbs conversion (fractional)', 50.5, 'lbs', 50.5 * KG_TO_LBS],
  ])('%s', (_, kg, unit, expected) => {
    expect(convertWeight(kg, unit as 'lbs' | 'kg')).toBeCloseTo(expected, 5);
  });
});

describe('roundWeight', () => {
  const KG_TO_LBS = 2.20462262185;

  it.each([
    ['kg passthrough with rounding', 100.4, 'kg', 100],
    ['kg passthrough rounds up', 100.6, 'kg', 101],
    ['kg passthrough zero', 0, 'kg', 0],
    ['kg passthrough negative', -50.4, 'kg', -50],
    ['lbs conversion and round', 100, 'lbs', Math.round(100 * KG_TO_LBS)],
    ['lbs conversion fractional', 50.5, 'lbs', Math.round(50.5 * KG_TO_LBS)],
    ['lbs zero', 0, 'lbs', 0],
    ['lbs negative', -50, 'lbs', Math.round(-50 * KG_TO_LBS)],
  ])('%s', (_, kg, unit, expected) => {
    expect(roundWeight(kg, unit as 'lbs' | 'kg')).toBe(expected);
  });
});

describe('formatWeight', () => {
  const KG_TO_LBS = 2.20462262185;

  it.each([
    ['default decimals=0 kg', 100, 'kg', undefined, `${Math.round(100)} kg`],
    ['default decimals=0 lbs', 100, 'lbs', undefined, `${Math.round(100 * KG_TO_LBS)} lbs`],
    ['decimals=0 zero', 0, 'kg', 0, '0 kg'],
    ['decimals=1 kg', 100.5, 'kg', 1, '100.5 kg'],
    ['decimals=1 lbs', 100, 'lbs', 1, `${(100 * KG_TO_LBS).toFixed(1)} lbs`],
    ['decimals=2 kg', 100.55, 'kg', 2, '100.55 kg'],
    ['decimals=2 lbs', 100, 'lbs', 2, `${(100 * KG_TO_LBS).toFixed(2)} lbs`],
    ['negative kg decimals=0', -50, 'kg', 0, '-50 kg'],
    ['negative lbs decimals=0', -50, 'lbs', 0, `${Math.round(-50 * KG_TO_LBS)} lbs`],
    ['negative lbs decimals=2', -50, 'lbs', 2, `${(-50 * KG_TO_LBS).toFixed(2)} lbs`],
  ])('%s', (_, kg, unit, decimals, expected) => {
    expect(formatWeight(kg, unit as 'lbs' | 'kg', decimals as number | undefined)).toBe(expected);
  });
});
