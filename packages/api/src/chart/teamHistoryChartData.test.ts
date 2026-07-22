import { describe, it, expect } from 'vitest';
import type { Point, NormalizationModel } from '@dyel/pipeline';
import {
  buildTeamHistoryChartData,
  normalizeTeamHistoryPoints,
  NORMALIZED_KEY_SUFFIX,
} from './teamHistoryChartData';

const point = (t: number, v: number): Point => ({
  t,
  v,
  series: 'test',
  tags: new Set(),
});

const normModel = (
  variantFactor: Record<string, { factor: number; n: number }> = {},
  baseline: Record<string, string> = {}
): NormalizationModel => ({
  fittedAt: 0,
  baseline,
  variantFactor,
  addlWtOffset: {},
});

describe('normalizeTeamHistoryPoints', () => {
  it.each([
    [
      'canonical with fitted variantFactor divides v by factor',
      [point(1000, 100)],
      'pause-bench',
      normModel({ 'pause-bench': { factor: 0.9, n: 5 } }),
      [{ t: 1000, v: expect.closeTo(111.11, 1), series: 'test', tags: new Set() }],
    ],
    [
      'canonical that IS the baseline (present in model.baseline values) has factor of 1',
      [point(1000, 100)],
      'bench',
      normModel({}, { 'lift:bench': 'bench' }),
      [{ t: 1000, v: 100, series: 'test', tags: new Set() }],
    ],
    [
      'canonical with no fitted factor is dropped (not falling back to raw)',
      [point(1000, 100)],
      'bench-with-chains',
      normModel({}),
      [],
    ],
    ['empty input Point[] produces empty result', [], 'bench', normModel(), []],
  ])('%s', (_, input, canonical, model, expected) => {
    expect(normalizeTeamHistoryPoints(input, canonical, model)).toEqual(expected);
  });
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

  describe('3-arg form with normalizedPointsByLifter', () => {
    it.each([
      [
        'lifter with both raw and normalized points produces both keys in data, only plain name in lifters',
        new Map([['alice', [point(1000, 100)]]]),
        new Map([['alice', [point(1000, 111)]]]),
        'kg',
        {
          lifters: ['alice'],
          data: [
            {
              date: new Date(1000).toISOString(),
              alice: 100,
              [`alice${NORMALIZED_KEY_SUFFIX}`]: 111,
            },
          ],
        },
      ],
      [
        'lifter with raw points but empty normalized Point[] produces no suffixed key',
        new Map([['alice', [point(1000, 100)]]]),
        new Map([['alice', []]]),
        'kg',
        {
          lifters: ['alice'],
          data: [{ date: new Date(1000).toISOString(), alice: 100 }],
        },
      ],
      [
        '2-arg call (omitting third argument) behaves identically to before',
        new Map([['alice', [point(1000, 100)]]]),
        undefined,
        'kg',
        {
          lifters: ['alice'],
          data: [{ date: new Date(1000).toISOString(), alice: 100 }],
        },
      ],
    ])('%s', (_, pointsByLifter, normalizedPointsByLifter, unit, expected) => {
      if (normalizedPointsByLifter === undefined) {
        expect(buildTeamHistoryChartData(pointsByLifter, unit)).toEqual(expected);
      } else {
        expect(buildTeamHistoryChartData(pointsByLifter, unit, normalizedPointsByLifter)).toEqual(
          expected
        );
      }
    });
  });
});
