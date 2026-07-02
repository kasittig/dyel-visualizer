import { describe, expect, it } from 'vitest';
import { findRepMaxCols } from './findRepMaxCols';

describe('findRepMaxCols', () => {
  it('finds a bare 1rm column', () => {
    expect(findRepMaxCols({ '1rm': '315' })).toEqual([{ reps: 1, value: '315' }]);
  });

  it('finds multiple rep-max columns and preserves their values', () => {
    const row = { '1rm': '315', '3rm': '285', '5rm': '265' };
    expect(findRepMaxCols(row)).toEqual([
      { reps: 1, value: '315' },
      { reps: 3, value: '285' },
      { reps: 5, value: '265' },
    ]);
  });

  it('matches a unit-annotated header like 1rm (kg)', () => {
    expect(findRepMaxCols({ '1rm (kg)': '140' })).toEqual([{ reps: 1, value: '140' }]);
  });

  it('ignores unrelated columns', () => {
    expect(findRepMaxCols({ exercise: 'Squat', date: '2024-01-01', reps: '5' })).toEqual([]);
  });

  it('does not match a column that merely starts with digits+rm as a substring', () => {
    expect(findRepMaxCols({ '10rmx': '100' })).toEqual([]);
  });
});
