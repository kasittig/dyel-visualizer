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
    ['speed', 'Speed'],
    ['POWER', 'Power'],
    ['anaerobic_work_capacity', 'Anaerobic Work Capacity'],
    ['technical_proficiency_development', 'Technical Proficiency Development'],
  ])('formats %s to %s', (input, expected) => {
    expect(formatEffect(input)).toBe(expected);
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
    ['conversion precision handling', 2.5, 'lbs', '+5.5lbs'],
    ['precision to 1 decimal place', 2.5, 'kg', '+2.5kg'],
  ])('formats %s correctly', (_, offsetKg, unit, expected) => {
    expect(formatAddlWtOffset(offsetKg, unit as 'lbs' | 'kg')).toBe(expected);
  });
});
