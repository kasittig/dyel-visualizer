import { describe, expect, it } from 'vitest';
import { findCol } from './findCol';

describe('findCol', () => {
  it("matches 'Weight (lbs)'", () => {
    expect(findCol({ 'weight (lbs)': '135' }, 'weight')).toBe('135');
  });

  it("matches 'weight (kg)'", () => {
    expect(findCol({ 'weight (kg)': '60' }, 'weight')).toBe('60');
  });

  it("matches bare 'weight'", () => {
    expect(findCol({ weight: '100' }, 'weight')).toBe('100');
  });

  it("does not match 'bodyweight (lbs)'", () => {
    expect(findCol({ 'bodyweight (lbs)': '175' }, 'weight')).toBeUndefined();
  });

  it("does not match 'body weight (lbs)'", () => {
    expect(findCol({ 'body weight (lbs)': '175' }, 'weight')).toBeUndefined();
  });

  it('prefers weight over bodyweight when both columns present', () => {
    const row = { 'bodyweight (lbs)': '175', 'weight (lbs)': '135' };
    expect(findCol(row, 'weight')).toBe('135');
  });

  it('treats metacharacters in keyword as literals', () => {
    expect(findCol({ 'wt.lbs': '135' }, 'wt.lbs')).toBe('135');
    expect(findCol({ 'wt-lbs': '135' }, 'wt.lbs')).toBeUndefined();
  });
});
