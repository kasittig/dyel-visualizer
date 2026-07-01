import { describe, it, expect } from 'vitest';
import { detectWeightUnit } from './detectWeightUnit';

describe('detectWeightUnit', () => {
  it('reads kg from the weight header', () => {
    expect(detectWeightUnit(['exercise', 'weight (kg)', 'reps'])).toBe('kg');
  });

  it('reads lbs from the weight header', () => {
    expect(detectWeightUnit(['exercise', 'weight (lbs)', 'reps'])).toBe('lbs');
  });

  it('returns null when the weight column has no unit', () => {
    expect(detectWeightUnit(['exercise', 'weight', 'reps'])).toBeNull();
  });

  it('returns null when there is no weight column', () => {
    expect(detectWeightUnit(['exercise', 'reps'])).toBeNull();
  });

  it("does not match columns that merely start with 'weight'", () => {
    expect(detectWeightUnit(['weightlifting'])).toBeNull();
  });
});
