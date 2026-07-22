import { describe, it, expect } from 'vitest';
import type { Point } from '@dyel/pipeline';
import { buildTeamHistoryChartData } from './teamHistoryChartData';

const point = (t: number, v: number): Point => ({
  t,
  v,
  series: 'test',
  tags: new Set(),
});

describe('buildTeamHistoryChartData', () => {
  it.each([
    [
      'two lifters with overlapping dates merge into same ChartPoint row',
      new Map([
        ['alice', [point(1000, 100), point(2000, 110)]],
        ['bob', [point(1000, 90), point(2000, 95)]],
      ]),
      'kg',
      {
        lifters: ['alice', 'bob'],
        data: [
          { date: new Date(1000).toISOString(), alice: 100, bob: 90 },
          { date: new Date(2000).toISOString(), alice: 110, bob: 95 },
        ],
      },
    ],
    [
      'two lifters with disjoint dates produce separate rows sorted ascending',
      new Map([
        ['alice', [point(1000, 100)]],
        ['bob', [point(2000, 95)]],
      ]),
      'kg',
      {
        lifters: ['alice', 'bob'],
        data: [
          { date: new Date(1000).toISOString(), alice: 100 },
          { date: new Date(2000).toISOString(), bob: 95 },
        ],
      },
    ],
    [
      'lifter with empty Point[] is excluded from lifters and data',
      new Map([
        ['alice', [point(1000, 100)]],
        ['bob', []],
        ['charlie', [point(2000, 120)]],
      ]),
      'kg',
      {
        lifters: ['alice', 'charlie'],
        data: [
          { date: new Date(1000).toISOString(), alice: 100 },
          { date: new Date(2000).toISOString(), charlie: 120 },
        ],
      },
    ],
    [
      'unit kg leaves values unchanged (rounded)',
      new Map([['alice', [point(1000, 100.4)]]]),
      'kg',
      {
        lifters: ['alice'],
        data: [{ date: new Date(1000).toISOString(), alice: 100 }],
      },
    ],
    [
      'unit lbs converts and rounds values appropriately',
      new Map([['alice', [point(1000, 100)]]]),
      'lbs',
      {
        lifters: ['alice'],
        data: [{ date: new Date(1000).toISOString(), alice: 220 }],
      },
    ],
    [
      'empty pointsByLifter produces empty result',
      new Map(),
      'kg',
      {
        lifters: [],
        data: [],
      },
    ],
    [
      'lifters are sorted alphabetically',
      new Map([
        ['charlie', [point(1000, 100)]],
        ['alice', [point(1000, 95)]],
        ['bob', [point(1000, 105)]],
      ]),
      'kg',
      {
        lifters: ['alice', 'bob', 'charlie'],
        data: [{ date: new Date(1000).toISOString(), alice: 95, bob: 105, charlie: 100 }],
      },
    ],
  ])('%s', (_, pointsByLifter, unit, expected) => {
    expect(buildTeamHistoryChartData(pointsByLifter, unit)).toEqual(expected);
  });
});
