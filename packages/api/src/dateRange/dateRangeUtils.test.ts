import { describe, it, expect } from 'vitest';
import {
  dateRangeToRenderParams,
  isRecordInDateRange,
  presetDateRange,
  activePreset,
  defaultDateRangeFromLastSession,
  type PresetId,
} from './dateRangeUtils';

const d = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const ms = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
  new Date(y, m - 1, d, h, min, s, ms).getTime();

describe('dateRangeToRenderParams', () => {
  it.each([
    [
      'both defined',
      d(2024, 1, 15),
      d(2024, 3, 20),
      { dateRange: [ms(2024, 1, 15), ms(2024, 3, 20)] },
    ],
    ['from undefined', undefined, d(2024, 3, 20), {}],
    ['to undefined', d(2024, 1, 15), undefined, {}],
    ['both undefined', undefined, undefined, {}],
  ])('%s', (_, from, to, expected) => {
    expect(dateRangeToRenderParams(from, to)).toEqual(expected);
  });
});

describe('isRecordInDateRange', () => {
  const from = d(2024, 1, 10);
  const to = d(2024, 3, 20);

  it.each([
    ['within range', ms(2024, 1, 15, 12), from, to, true],
    ['on from date', ms(2024, 1, 10), from, to, true],
    ['on to date midnight', ms(2024, 3, 20), from, to, true],
    ['end-of-day on to date', ms(2024, 3, 20, 23, 59, 59, 999), from, to, true],
    ['after end-of-day on to date', ms(2024, 3, 21), from, to, false],
    ['before from date', ms(2024, 1, 9, 23, 59, 59), from, to, false],
    ['no from bound, within to', ms(2024, 2, 15, 12), undefined, to, true],
    ['no from bound, after to', ms(2024, 3, 21), undefined, to, false],
    ['no to bound, after from', ms(2024, 2, 15, 12), from, undefined, true],
    ['no to bound, before from', ms(2024, 1, 9, 23, 59, 59), from, undefined, false],
    ['no bounds', ms(2024, 1, 1, 12), undefined, undefined, true],
  ])('%s', (_, dateMs, f, t, expected) => {
    expect(isRecordInDateRange(dateMs, f, t)).toBe(expected);
  });
});

describe('presetDateRange & activePreset', () => {
  const today = d(2024, 3, 20);

  it.each([
    ['2w', d(2024, 3, 6), d(2024, 3, 20), '2w'],
    ['1m', d(2024, 2, 20), d(2024, 3, 20), '1m'],
    ['3m', d(2023, 12, 20), d(2024, 3, 20), '3m'],
    ['all', new Date(1970, 0, 1), d(2024, 3, 20), 'all'],
  ])('preset %s matches expected bounds', (preset, expFrom, expTo, id) => {
    const res = presetDateRange(preset as PresetId, today);
    expect(res.from.toDateString()).toBe(expFrom.toDateString());
    expect(res.to.toDateString()).toBe(expTo.toDateString());
    expect(activePreset(expFrom, expTo, today)).toBe(id);
  });

  it.each([
    ['to does not match today', d(2024, 3, 6), d(2024, 3, 19)],
    ['from does not match preset', d(2024, 3, 5), d(2024, 3, 20)],
    ['both undefined', undefined, undefined],
  ])('activePreset returns null when %s', (_, f, t) => {
    expect(activePreset(f, t, today)).toBeNull();
  });
});

describe('defaultDateRangeFromLastSession', () => {
  it.each([
    ['january date', d(2024, 1, 15), d(2023, 10, 15), d(2024, 1, 15)],
    ['december date', d(2024, 12, 25), d(2024, 9, 25), d(2024, 12, 25)],
    ['march date', d(2024, 3, 20), d(2023, 12, 20), d(2024, 3, 20)],
  ])('%s', (_, lastSession, expFrom, expTo) => {
    const res = defaultDateRangeFromLastSession(lastSession);
    expect(res.from.toDateString()).toBe(expFrom.toDateString());
    expect(res.to.toDateString()).toBe(expTo.toDateString());
  });
});
