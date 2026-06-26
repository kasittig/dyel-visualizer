import { describe, it, expect } from 'vitest';
import { calculateDots } from './metrics';

describe('calculateDots', () => {
  it('returns 0 when bodyweight is below 40 kg', () => {
    expect(calculateDots(39, 300, false)).toBe(0);
  });

  it('returns 0 when bodyweight is exactly 39.9 kg', () => {
    expect(calculateDots(39.9, 300, false)).toBe(0);
  });

  it('returns 0 for male when bodyweight exceeds 210 kg', () => {
    expect(calculateDots(211, 300, false)).toBe(0);
  });

  it('returns 0 for female when bodyweight exceeds 150 kg', () => {
    expect(calculateDots(151, 500, true)).toBe(0);
  });

  it('returns a positive score for female at exactly 150 kg', () => {
    const score = calculateDots(150, 500, true);
    expect(score).toBeGreaterThan(0);
  });

  it('returns a positive score for male at exactly 210 kg', () => {
    const score = calculateDots(210, 300, false);
    expect(score).toBeGreaterThan(0);
  });

  it('returns a positive score for a typical female lifter', () => {
    const score = calculateDots(70, 300, false);
    expect(score).toBeGreaterThan(0);
  });

  it('returns a positive score for a typical male lifter', () => {
    const score = calculateDots(90, 500, false);
    expect(score).toBeGreaterThan(0);
  });

  it('produces different scores for male and female at same bodyweight and total', () => {
    const maleScore = calculateDots(80, 400, true);
    const femaleScore = calculateDots(80, 400, false);
    expect(maleScore).not.toBe(femaleScore);
  });

  it('scales linearly with total weight', () => {
    const score1 = calculateDots(80, 400, true);
    const score2 = calculateDots(80, 800, true);
    expect(score2).toBeCloseTo(score1 * 2, 1);
  });

  it('rounds the result to 2 decimal places', () => {
    const score = calculateDots(75.5, 350.25, false);
    const rounded = Math.round(score * 100) / 100;
    expect(score).toBe(rounded);
  });

  it('does not convert when unit is "lbs" (default)', () => {
    const score1 = calculateDots(100, 300, false);
    const score2 = calculateDots(100, 300, false, 'lbs');
    expect(score1).toBe(score2);
  });
});
