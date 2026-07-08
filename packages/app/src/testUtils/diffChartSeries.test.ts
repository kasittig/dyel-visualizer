import { describe, it, expect } from 'vitest';
import type { ChartPoint, ConjugateExercise } from '@dyel/core';
import { joinChartPointsByDate, diffSeries, compareBaselineIdentity } from './diffChartSeries';

process.env.TZ = 'America/New_York'; // Prevent UTC parsing bugs for 'YYYY-MM-DD'

describe('joinChartPointsByDate', () => {
  type Case = [string, ChartPoint[], ChartPoint[], ReturnType<typeof joinChartPointsByDate>];

  it.each<Case>([
    ['both empty', [], [], []],
    [
      'only a has points',
      [{ date: '2026-01-01', squat: 300 }],
      [],
      [{ dateKey: '2026-01-01', a: { date: '2026-01-01', squat: 300 } }],
    ],
    [
      'only b has points',
      [],
      [{ date: '2026-01-02', bench: 250 }],
      [{ dateKey: '2026-01-02', b: { date: '2026-01-02', bench: 250 } }],
    ],
    [
      'same date, different formats join',
      [{ date: '2026-01-15T00:00:00', squat: 300 }],
      [{ date: '2026-01-15T12:30:45.000Z', bench: 250 }],
      [
        {
          dateKey: '2026-01-15',
          a: { date: '2026-01-15T00:00:00', squat: 300 },
          b: { date: '2026-01-15T12:30:45.000Z', bench: 250 },
        },
      ],
    ],
    [
      'different dates separate',
      [{ date: '2026-01-01', squat: 300 }],
      [{ date: '2026-01-02', bench: 250 }],
      [
        { dateKey: '2026-01-01', a: { date: '2026-01-01', squat: 300 } },
        { dateKey: '2026-01-02', b: { date: '2026-01-02', bench: 250 } },
      ],
    ],
    [
      'multiple a last-write-wins',
      [
        { date: '2026-01-01T08:00:00', squat: 300 },
        { date: '2026-01-01T18:00:00', squat: 310 },
      ],
      [],
      [{ dateKey: '2026-01-01', a: { date: '2026-01-01T18:00:00', squat: 310 } }],
    ],
    [
      'multiple b last-write-wins',
      [],
      [
        { date: '2026-01-05T08:00:00', bench: 250 },
        { date: '2026-01-05T20:00:00', bench: 270 },
      ],
      [{ dateKey: '2026-01-05', b: { date: '2026-01-05T20:00:00', bench: 270 } }],
    ],
    [
      'sorted ascending by dateKey',
      [
        { date: '2026-01-05', squat: 400 },
        { date: '2026-01-01', squat: 300 },
        { date: '2026-01-10', squat: 350 },
      ],
      [],
      [
        { dateKey: '2026-01-01', a: { date: '2026-01-01', squat: 300 } },
        { dateKey: '2026-01-05', a: { date: '2026-01-05', squat: 400 } },
        { dateKey: '2026-01-10', a: { date: '2026-01-10', squat: 350 } },
      ],
    ],
    [
      'bare YYYY-MM-DD and UTC same day join',
      [{ date: '2026-02-02', squat: 300 }],
      [{ date: '2026-02-02T05:00:00.000Z', bench: 250 }],
      [
        {
          dateKey: '2026-02-02',
          a: { date: '2026-02-02', squat: 300 },
          b: { date: '2026-02-02T05:00:00.000Z', bench: 250 },
        },
      ],
    ],
    [
      'bare YYYY-MM-DD and UTC diff day separate',
      [{ date: '2026-02-02', squat: 300 }],
      [{ date: '2026-02-03T05:00:00.000Z', bench: 250 }],
      [
        { dateKey: '2026-02-02', a: { date: '2026-02-02', squat: 300 } },
        { dateKey: '2026-02-03', b: { date: '2026-02-03T05:00:00.000Z', bench: 250 } },
      ],
    ],
  ])('%s', (_, a, b, expected) => {
    expect(joinChartPointsByDate(a, b)).toEqual(expected);
  });
});

describe('diffSeries', () => {
  type Case = [
    string,
    ReturnType<typeof joinChartPointsByDate>,
    string,
    ReturnType<typeof diffSeries>,
  ];

  const makeExpected = (
    overrides?: Partial<ReturnType<typeof diffSeries>>
  ): ReturnType<typeof diffSeries> => ({
    seriesName: 'squat',
    comparedCount: 0,
    missingInA: 0,
    missingInB: 0,
    maxAbsDiff: 0,
    maxRelDiff: 0,
    ...overrides,
  });

  it.each<Case>([
    ['empty array returns zero-value result', [], 'squat', makeExpected()],
    [
      'both sides increments count and tracks diffs',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', squat: 320 },
        },
      ],
      'squat',
      makeExpected({ comparedCount: 1, maxAbsDiff: 20, maxRelDiff: 20 / 320 }),
    ],
    [
      'only in a increments missingInB',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', bench: 250 },
        },
      ],
      'squat',
      makeExpected({ missingInB: 1 }),
    ],
    [
      'only in b increments missingInA',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', bench: 250 },
          b: { date: '2026-01-01', squat: 300 },
        },
      ],
      'squat',
      makeExpected({ missingInA: 1 }),
    ],
    [
      'neither side leaves all counters at zero',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', bench: 250 },
          b: { date: '2026-01-01', deadlift: 400 },
        },
      ],
      'squat',
      makeExpected(),
    ],
    [
      'tracks maxAbsDiff across all rows',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', squat: 310 },
        },
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', squat: 320 },
          b: { date: '2026-01-02', squat: 335 },
        },
        {
          dateKey: '2026-01-03',
          a: { date: '2026-01-03', squat: 350 },
          b: { date: '2026-01-03', squat: 352 },
        },
      ],
      'squat',
      makeExpected({ comparedCount: 3, maxAbsDiff: 15, maxRelDiff: 15 / 335 }),
    ],
    [
      'both values 0 returns 0 relDiff',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 0 },
          b: { date: '2026-01-01', squat: 0 },
        },
      ],
      'squat',
      makeExpected({ comparedCount: 1 }),
    ],
    [
      'series not present anywhere leaves all zero',
      [
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', deadlift: 400 },
          b: { date: '2026-01-02', deadlift: 420 },
        },
      ],
      'squat',
      makeExpected(),
    ],
    [
      'mixed rows processes compared and missing',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 300 },
          b: { date: '2026-01-01', squat: 310 },
        },
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', squat: 320 },
          b: { date: '2026-01-02', bench: 250 },
        },
        {
          dateKey: '2026-01-03',
          a: { date: '2026-01-03', bench: 250 },
          b: { date: '2026-01-03', squat: 340 },
        },
      ],
      'squat',
      makeExpected({
        comparedCount: 1,
        missingInA: 1,
        missingInB: 1,
        maxAbsDiff: 10,
        maxRelDiff: 10 / 310,
      }),
    ],
    [
      'maxRelDiff tracks maximum relative diff',
      [
        {
          dateKey: '2026-01-01',
          a: { date: '2026-01-01', squat: 100 },
          b: { date: '2026-01-01', squat: 110 },
        },
        {
          dateKey: '2026-01-02',
          a: { date: '2026-01-02', squat: 1000 },
          b: { date: '2026-01-02', squat: 1005 },
        },
      ],
      'squat',
      makeExpected({ comparedCount: 2, maxAbsDiff: 10, maxRelDiff: 10 / 110 }),
    ],
  ])('%s', (_, joined, seriesName, expected) => {
    expect(diffSeries(joined, seriesName)).toEqual(expected);
  });
});

describe('compareBaselineIdentity', () => {
  type Case = [
    string,
    string,
    ConjugateExercise | undefined,
    string | undefined,
    'sumo' | 'conventional',
    boolean,
  ];

  const ex = (name: string, props?: Partial<ConjugateExercise>): ConjugateExercise => ({
    type: 'squat',
    displayName: name,
    bar: 'standard',
    stance: 'competition',
    equipment: null,
    addlWts: [],
    averageIndex: null,
    expectedBaseline: null,
    status: null,
    diagnostic: null,
    effects: [],
    ...props,
  });

  it.each<Case>([
    ['squat: both undefined', 'squat', undefined, undefined, 'sumo', true],
    ['squat: standard matches', 'squat', ex('Squat'), 'squat', 'sumo', true],
    [
      'squat: ssb legacy matches canonical',
      'squat',
      ex('SSB', { bar: 'ssb' }),
      'squat-ssb',
      'sumo',
      true,
    ],
    [
      'squat: paused legacy matches canonical',
      'squat',
      ex('Pause', { equipment: 'pause' }),
      'squat-pause',
      'sumo',
      true,
    ],
    ['squat: ssb mismatch', 'squat', ex('SSB', { bar: 'ssb' }), 'squat', 'sumo', false],
    ['squat: legacy undef vs canonical def', 'squat', undefined, 'squat', 'sumo', false],
    ['squat: legacy def vs canonical undef', 'squat', ex('Squat'), undefined, 'sumo', false],
    ['deadlift: both undefined', 'deadlift', undefined, undefined, 'sumo', true],
    [
      'deadlift: sumo stance matches',
      'deadlift',
      ex('Sumo', { type: 'deadlift', stance: 'sumo' }),
      'deadlift-sumo',
      'sumo',
      true,
    ],
    [
      'deadlift: conventional stance matches',
      'deadlift',
      ex('Conv', { type: 'deadlift', stance: 'conventional' }),
      'deadlift-conventional',
      'sumo',
      true,
    ],
    [
      'deadlift: opposite with sumo pref -> conv',
      'deadlift',
      ex('Opp', { type: 'deadlift', stance: 'opposite' }),
      'deadlift-conventional',
      'sumo',
      true,
    ],
    [
      'deadlift: null with sumo pref -> sumo',
      'deadlift',
      ex('DL', { type: 'deadlift', stance: null }),
      'deadlift-sumo',
      'sumo',
      true,
    ],
    [
      'deadlift: bare canonical resolves via pref',
      'deadlift',
      ex('DL', { type: 'deadlift', stance: null }),
      'deadlift',
      'sumo',
      true,
    ],
    [
      'deadlift: stance mismatch',
      'deadlift',
      ex('Sumo', { type: 'deadlift', stance: 'sumo' }),
      'deadlift-conventional',
      'sumo',
      false,
    ],
    ['bench: standard matches', 'bench', ex('Bench', { type: 'bench' }), 'bench', 'sumo', true],
    [
      'bench: with equipment matches',
      'bench',
      ex('Pause', { type: 'bench', equipment: 'pause' }),
      'bench-pause',
      'sumo',
      true,
    ],
  ])('%s', (_, family, legacy, canonical, deadliftStance, matches) => {
    expect(compareBaselineIdentity(family, legacy, canonical, deadliftStance)).toMatchObject({
      family,
      matches,
    });
  });
});
