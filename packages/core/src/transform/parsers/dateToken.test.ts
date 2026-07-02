import { describe, expect, it } from 'vitest';
import { extractDateToken } from './dateToken';

describe('extractDateToken', () => {
  it('extracts an ISO date', () => {
    expect(extractDateToken('2026-02-05 bench 225lbs x5')).toEqual({
      dateStr: '2026-02-05',
      remainder: '  bench 225lbs x5',
    });
  });

  it('extracts a slash date with a 4-digit year', () => {
    expect(extractDateToken('bench 225lbs x5 2/5/2026')).toEqual({
      dateStr: '2026-02-05',
      remainder: 'bench 225lbs x5  ',
    });
  });

  it('extracts a slash date with a 2-digit year', () => {
    expect(extractDateToken('bench 225lbs x5 2/5/26')).toEqual({
      dateStr: '2026-02-05',
      remainder: 'bench 225lbs x5  ',
    });
  });

  it('extracts a slash date with no year, defaulting to the current year', () => {
    const expectedYear = new Date().getFullYear();
    expect(extractDateToken('bench 225lbs x5 2/5')).toEqual({
      dateStr: `${expectedYear}-02-05`,
      remainder: 'bench 225lbs x5  ',
    });
  });

  it('extracts a month-day date with a year', () => {
    expect(extractDateToken('feb 5, 2026 bench 225lbs x5')).toEqual({
      dateStr: '2026-02-05',
      remainder: '  bench 225lbs x5',
    });
  });

  it('extracts an abbreviated month-day date with no year', () => {
    const expectedYear = new Date().getFullYear();
    expect(extractDateToken('bench 225lbs x5 feb 5')).toEqual({
      dateStr: `${expectedYear}-02-05`,
      remainder: 'bench 225lbs x5  ',
    });
  });

  it('extracts a full month name, case-insensitively', () => {
    const expectedYear = new Date().getFullYear();
    expect(extractDateToken('February 5 bench 225lbs x5')).toEqual({
      dateStr: `${expectedYear}-02-05`,
      remainder: '  bench 225lbs x5',
    });
  });

  it('extracts a day-month date with a year', () => {
    expect(extractDateToken('5 feb 2026 bench 225lbs x5')).toEqual({
      dateStr: '2026-02-05',
      remainder: '  bench 225lbs x5',
    });
  });

  it('extracts a day-month date with an ordinal suffix', () => {
    const expectedYear = new Date().getFullYear();
    expect(extractDateToken('bench 225lbs x5 5th feb')).toEqual({
      dateStr: `${expectedYear}-02-05`,
      remainder: 'bench 225lbs x5  ',
    });
  });

  it('returns the line unchanged when no date is found', () => {
    expect(extractDateToken('bench 225lbs x5')).toEqual({
      dateStr: null,
      remainder: 'bench 225lbs x5',
    });
  });
});
