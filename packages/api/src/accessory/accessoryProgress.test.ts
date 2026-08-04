import { describe, expect, it } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildAccessoryProgress } from './accessoryProgress';

const day = (offset: number) => new Date(2026, 0, 31 - offset);
const rec = (date: Date, weight = 100, reps = 10, sets?: string): TaggedSetRecord => ({
  date: date.getTime(),
  exercise: 'row',
  canonical: 'row',
  weight,
  reps,
  rpe: null,
  effects: [],
  baselineRange: null,
  meta: { rawExercise: 'Row', ...(sets ? { sets } : {}) },
  tags: new Set(['lift:accessory']),
});

describe('buildAccessoryProgress', () => {
  const now = new Date(2026, 0, 31);

  it.each([
    ['load progression', [rec(day(1), 110), rec(day(8), 100)], 'progressing', 10, 0, 100],
    ['rep progression', [rec(day(1), 100, 12), rec(day(8), 100, 10)], 'progressing', 0, 2, 200],
    ['volume regression', [rec(day(1), 90, 8), rec(day(8), 100, 10)], 'regressing', -10, -2, -280],
  ])('%s', (_, records, status, load, reps, volume) => {
    expect(buildAccessoryProgress(records, now)).toMatchObject({
      status,
      change: { load, reps, volume },
      scope: 'all-time',
    });
  });

  it.each([
    ['new', [rec(day(1))], 'new'],
    ['stale', [rec(day(22)), rec(day(30))], 'stale'],
    [
      'different set counts',
      [rec(day(1), 100, 10, '4'), rec(day(8), 100, 10, '3')],
      'insufficient-history',
    ],
  ])('%s status', (_, records, status) => {
    expect(buildAccessoryProgress(records, now)?.status).toBe(status);
  });

  it('does not claim a load change for bodyweight records', () => {
    expect(buildAccessoryProgress([rec(day(1), 0, 12), rec(day(8), 0, 10)], now)).toMatchObject({
      status: 'progressing',
      change: { load: null, reps: 2, volume: null },
      best: null,
    });
  });

  it('exposes the prior comparable and best matching-scheme results', () => {
    expect(
      buildAccessoryProgress([rec(day(1), 110), rec(day(8), 100), rec(day(15), 105)], now)
    ).toMatchObject({
      previous: { date: '2026-01-23', weight: 100 },
      best: { date: '2026-01-30', weight: 110 },
    });
  });

  it('skips intervening incompatible sessions when finding a comparison', () => {
    expect(
      buildAccessoryProgress(
        [rec(day(1), 100, 12, '3'), rec(day(8), 100, 8, '4'), rec(day(15), 100, 10, '3')],
        now
      )
    ).toMatchObject({
      status: 'progressing',
      previous: { date: '2026-01-16', sets: 3, reps: 10 },
      change: { reps: 2 },
    });
  });

  it("aggregates every row's set multiplier and rejects mixed session schemes", () => {
    expect(
      buildAccessoryProgress(
        [rec(day(1), 100, 10, '3'), rec(day(1), 80, 12, '2'), rec(day(8), 100, 10, '3')],
        now
      )
    ).toMatchObject({
      status: 'insufficient-history',
      previous: null,
      change: null,
      best: null,
    });
  });
});
