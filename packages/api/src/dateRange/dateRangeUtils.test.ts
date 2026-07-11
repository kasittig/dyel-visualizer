import { describe, it, expect, beforeEach } from 'vitest';
import {
  dateRangeToRenderParams,
  isRecordInDateRange,
  presetDateRange,
  activePreset,
  defaultDateRangeFromLastSession,
  type PresetId,
} from './dateRangeUtils';

const d = (year: number, month: number, day: number) => new Date(year, month - 1, day);

describe('dateRangeToRenderParams', () => {
  it.each([
    [
      'both from and to defined',
      d(2024, 1, 15),
      d(2024, 3, 20),
      { dateRange: [new Date(2024, 0, 15).getTime(), new Date(2024, 2, 20).getTime()] },
    ],
    ['from undefined', undefined, d(2024, 3, 20), {}],
    ['to undefined', d(2024, 1, 15), undefined, {}],
    ['both undefined', undefined, undefined, {}],
  ])('%s', (_, from, to, expected) => {
    expect(dateRangeToRenderParams(from, to)).toEqual(expected);
  });
});

describe('isRecordInDateRange', () => {
  it.each([
    [
      'record within range',
      new Date(2024, 0, 15, 12, 0, 0).getTime(),
      d(2024, 1, 10),
      d(2024, 3, 20),
      true,
    ],
    [
      'record on from date',
      new Date(2024, 0, 10, 0, 0, 0).getTime(),
      d(2024, 1, 10),
      d(2024, 3, 20),
      true,
    ],
    [
      'record on to date midnight',
      new Date(2024, 2, 20, 0, 0, 0).getTime(),
      d(2024, 1, 10),
      d(2024, 3, 20),
      true,
    ],
    [
      'record at end-of-day on to date (23:59:59.999)',
      new Date(2024, 2, 20, 23, 59, 59, 999).getTime(),
      d(2024, 1, 10),
      d(2024, 3, 20),
      true,
    ],
    [
      'record after end-of-day on to date',
      new Date(2024, 2, 21, 0, 0, 0).getTime(),
      d(2024, 1, 10),
      d(2024, 3, 20),
      false,
    ],
    [
      'record before from date',
      new Date(2024, 0, 9, 23, 59, 59).getTime(),
      d(2024, 1, 10),
      d(2024, 3, 20),
      false,
    ],
    [
      'no from bound, within to',
      new Date(2024, 1, 15, 12, 0, 0).getTime(),
      undefined,
      d(2024, 3, 20),
      true,
    ],
    [
      'no from bound, after to',
      new Date(2024, 2, 21, 0, 0, 0).getTime(),
      undefined,
      d(2024, 3, 20),
      false,
    ],
    [
      'no to bound, after from',
      new Date(2024, 1, 15, 12, 0, 0).getTime(),
      d(2024, 1, 10),
      undefined,
      true,
    ],
    [
      'no to bound, before from',
      new Date(2024, 0, 9, 23, 59, 59).getTime(),
      d(2024, 1, 10),
      undefined,
      false,
    ],
    [
      'no bounds (always true)',
      new Date(2024, 0, 1, 12, 0, 0).getTime(),
      undefined,
      undefined,
      true,
    ],
  ])('%s', (_, dateMs, from, to, expected) => {
    expect(isRecordInDateRange(dateMs, from, to)).toBe(expected);
  });
});

describe('presetDateRange', () => {
  let today: Date;

  beforeEach(() => {
    today = d(2024, 3, 20);
  });

  it.each([
    ['2w', '2w', d(2024, 3, 6), d(2024, 3, 20)],
    ['1m', '1m', d(2024, 2, 20), d(2024, 3, 20)],
    ['3m', '3m', d(2023, 12, 20), d(2024, 3, 20)],
    ['all', 'all', new Date(1970, 0, 1), d(2024, 3, 20)],
  ])('preset %s returns correct range', (_, preset, expectedFrom, expectedTo) => {
    const result = presetDateRange(preset as PresetId, today);
    expect(result.from.toDateString()).toBe(expectedFrom.toDateString());
    expect(result.to.toDateString()).toBe(expectedTo.toDateString());
  });
});

describe('activePreset', () => {
  let today: Date;

  beforeEach(() => {
    today = d(2024, 3, 20);
  });

  it.each([
    ['matches 2w', d(2024, 3, 6), d(2024, 3, 20), '2w'],
    ['matches 1m', d(2024, 2, 20), d(2024, 3, 20), '1m'],
    ['matches 3m', d(2023, 12, 20), d(2024, 3, 20), '3m'],
    ['matches all (from undefined)', undefined, d(2024, 3, 20), 'all'],
    ['no match: to does not match today', d(2024, 3, 6), d(2024, 3, 19), null],
    ['no match: from does not match any preset', d(2024, 3, 5), d(2024, 3, 20), null],
    ['no match: both undefined', undefined, undefined, null],
  ])('%s', (_, from, to, expected) => {
    expect(activePreset(from, to, today)).toBe(expected);
  });
});

describe('defaultDateRangeFromLastSession', () => {
  it.each([
    ['january date', d(2024, 1, 15), d(2023, 10, 15), d(2024, 1, 15)],
    ['december date (wraps year)', d(2024, 12, 25), d(2024, 9, 25), d(2024, 12, 25)],
    ['march date', d(2024, 3, 20), d(2023, 12, 20), d(2024, 3, 20)],
  ])('%s', (_, lastSessionDate, expectedFrom, expectedTo) => {
    const result = defaultDateRangeFromLastSession(lastSessionDate);
    expect(result.from.toDateString()).toBe(expectedFrom.toDateString());
    expect(result.to.toDateString()).toBe(expectedTo.toDateString());
  });
});
