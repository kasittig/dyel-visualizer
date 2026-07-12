import { describe, it, expect } from 'vitest';
import { convertWeight, roundWeight, formatWeight } from './weightUnit';

const MUL = 2.20462262185;

describe('weightUnit utilities', () => {
  it.each([
    ['kg zero', 0, 'kg', 0],
    ['kg pos', 100, 'kg', 100],
    ['kg neg', -50, 'kg', -50],
    ['kg frac', 50.5, 'kg', 50.5],
    ['lbs zero', 0, 'lbs', 0],
    ['lbs pos', 100, 'lbs', 100 * MUL],
    ['lbs neg', -50, 'lbs', -50 * MUL],
    ['lbs frac', 50.5, 'lbs', 50.5 * MUL],
  ])('convertWeight %s', (_, kg, unit, expected) => {
    expect(convertWeight(kg, unit as 'lbs' | 'kg')).toBeCloseTo(expected, 5);
  });

  it.each([
    ['kg down', 100.4, 'kg', 100],
    ['kg up', 100.6, 'kg', 101],
    ['kg zero', 0, 'kg', 0],
    ['kg neg', -50.4, 'kg', -50],
    ['lbs pos', 100, 'lbs', Math.round(100 * MUL)],
    ['lbs frac', 50.5, 'lbs', Math.round(50.5 * MUL)],
    ['lbs zero', 0, 'lbs', 0],
    ['lbs neg', -50, 'lbs', Math.round(-50 * MUL)],
  ])('roundWeight %s', (_, kg, unit, expected) => {
    expect(roundWeight(kg, unit as 'lbs' | 'kg')).toBe(expected);
  });

  it.each([
    ['def kg', 100, 'kg', undefined, '100 kg'],
    ['def lbs', 100, 'lbs', undefined, `${Math.round(100 * MUL)} lbs`],
    ['zero', 0, 'kg', 0, '0 kg'],
    ['dec1 kg', 100.5, 'kg', 1, '100.5 kg'],
    ['dec1 lbs', 100, 'lbs', 1, `${(100 * MUL).toFixed(1)} lbs`],
    ['dec2 kg', 100.55, 'kg', 2, '100.55 kg'],
    ['dec2 lbs', 100, 'lbs', 2, `${(100 * MUL).toFixed(2)} lbs`],
    ['neg kg', -50, 'kg', 0, '-50 kg'],
    ['neg lbs dec0', -50, 'lbs', 0, `${Math.round(-50 * MUL)} lbs`],
    ['neg lbs dec2', -50, 'lbs', 2, `${(-50 * MUL).toFixed(2)} lbs`],
  ])('formatWeight %s', (_, kg, unit, decimals, expected) => {
    expect(formatWeight(kg, unit as 'lbs' | 'kg', decimals)).toBe(expected);
  });
});
