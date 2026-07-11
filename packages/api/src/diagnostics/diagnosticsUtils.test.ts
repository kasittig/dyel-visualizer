import { describe, it, expect } from 'vitest';
import { formatEffect, formatAddlWtOffset } from './diagnosticsUtils';

describe('formatEffect', () => {
  it.each([
    ['hypertrophy', 'Hypertrophy'],
    ['strength', 'Strength'],
    ['power_development', 'Power Development'],
    ['muscular_endurance', 'Muscular Endurance'],
    ['aerobic_capacity', 'Aerobic Capacity'],
    ['STRENGTH', 'Strength'],
    ['POWER_OUTPUT', 'Power Output'],
  ])('formats %s to %s', (input, expected) => {
    expect(formatEffect(input)).toBe(expected);
  });

  it('handles single word lowercase', () => {
    expect(formatEffect('speed')).toBe('Speed');
  });

  it('handles single word uppercase', () => {
    expect(formatEffect('POWER')).toBe('Power');
  });

  it('handles multiple underscores', () => {
    expect(formatEffect('anaerobic_work_capacity')).toBe('Anaerobic Work Capacity');
  });

  it('capitalizes each word', () => {
    expect(formatEffect('technical_proficiency_development')).toBe(
      'Technical Proficiency Development'
    );
  });
});

describe('formatAddlWtOffset', () => {
  it.each([
    ['positive offset in lbs', 5, 'lbs', '+11.0lbs'],
    ['positive offset in kg', 5, 'kg', '+5.0kg'],
    ['negative offset in lbs', -2.5, 'lbs', '-5.5lbs'],
    ['negative offset in kg', -2.5, 'kg', '-2.5kg'],
    ['zero offset', 0, 'lbs', '+0.0lbs'],
    ['large offset in lbs', 10, 'lbs', '+22.0lbs'],
    ['large offset in kg', 10, 'kg', '+10.0kg'],
  ])('formats %s correctly', (_, offsetKg, unit, expected) => {
    expect(formatAddlWtOffset(offsetKg, unit as 'lbs' | 'kg')).toBe(expected);
  });

  it('adds + sign for positive values', () => {
    const result = formatAddlWtOffset(2, 'kg');
    expect(result.startsWith('+')).toBe(true);
  });

  it('adds - sign for negative values', () => {
    const result = formatAddlWtOffset(-3, 'kg');
    expect(result.startsWith('-')).toBe(true);
  });

  it('uses lbs suffix for lbs unit', () => {
    const result = formatAddlWtOffset(5, 'lbs');
    expect(result.endsWith('lbs')).toBe(true);
  });

  it('uses kg suffix for kg unit', () => {
    const result = formatAddlWtOffset(5, 'kg');
    expect(result.endsWith('kg')).toBe(true);
  });

  it('preserves precision to 1 decimal place', () => {
    const result = formatAddlWtOffset(2.5, 'kg');
    expect(result).toBe('+2.5kg');
  });

  it('handles conversion precision correctly', () => {
    // 2.5 kg ≈ 5.51155 lbs, should round to 5.5
    const result = formatAddlWtOffset(2.5, 'lbs');
    expect(result).toBe('+5.5lbs');
  });
});
