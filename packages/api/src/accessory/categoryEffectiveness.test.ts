import { describe, expect, it } from 'vitest';
import type { WeaknessTrendPoint } from '../diagnostics/weaknessTrends';
import type { AccessoryCategory } from './accessoryCoverage';
import { associateCategoryExposureWithLaterWeakness } from './categoryEffectiveness';

const DAY = 86_400_000;
const window = {
  exposure: { start: 0, end: 14 * DAY },
  outcome: { start: 14 * DAY, end: 28 * DAY },
};
const trend = (date: number, normalizedResult: number | null): WeaknessTrendPoint => ({
  date,
  quality: 'QUAD_DOMINANT',
  normalizedResult,
  status: 'insufficient-history',
  contributingVariations:
    normalizedResult === null
      ? []
      : [
          {
            canonical: 'squat-box',
            status: 'optimal',
            ratio: normalizedResult,
            latestAt: date,
          },
        ],
  evidenceCount: normalizedResult === null ? 0 : 2,
  staleEvidenceCount: 0,
  unassessedCount: 0,
});
const exposure = (weekStart: number, category: AccessoryCategory, sessionDates: number[]) => ({
  weekStart,
  category,
  sessionCount: sessionDates.length,
  sessionDates,
});

describe('associateCategoryExposureWithLaterWeakness', () => {
  it.each([
    ['possible improvement', 0.8, 0.9, 'possible-improvement', 0.1],
    ['no clear change', 0.8, 0.8, 'no-clear-change', 0],
    ['possible worsening', 0.9, 0.8, 'possible-worsening', -0.1],
    ['insufficient history', null, 0.9, 'insufficient-data', null],
  ])('%s', (_, baseline, outcome, status, weaknessChange) => {
    expect(
      associateCategoryExposureWithLaterWeakness(
        [exposure(0, 'quads', [0, DAY]), exposure(7 * DAY, 'quads', [7 * DAY, 8 * DAY, 9 * DAY])],
        [trend(7 * DAY, baseline), trend(21 * DAY, outcome)],
        window
      )
    ).toEqual([
      expect.objectContaining({
        category: 'quads',
        quality: 'QUAD_DOMINANT',
        sessionCount: 5,
        exposureWeekCount: 2,
        weaknessChange,
        baselineEvidenceCount: baseline === null ? 0 : 2,
        outcomeEvidenceCount: outcome === null ? 0 : 2,
        evidenceCount: (baseline === null ? 0 : 2) + (outcome === null ? 0 : 2),
        observationCount: outcome === null ? 0 : 1,
        baselineVariations: baseline === null ? [] : [{ canonical: 'squat-box', ratio: baseline }],
        outcomeVariations: outcome === null ? [] : [{ canonical: 'squat-box', ratio: outcome }],
        status,
        interpretation: expect.stringContaining(
          status === 'insufficient-data' ? 'Insufficient data' : 'was followed by'
        ),
      }),
    ]);
  });

  it('uses half-open boundaries and excludes future exposure and outcome data', () => {
    expect(
      associateCategoryExposureWithLaterWeakness(
        [
          exposure(-7 * DAY, 'quads', [-DAY]),
          exposure(0, 'quads', [0, DAY]),
          exposure(14 * DAY, 'quads', [14 * DAY]),
        ],
        [
          trend(28 * DAY, 0.1),
          trend(28 * DAY - 1, 1),
          trend(14 * DAY, 0.9),
          trend(-DAY, 0.1),
          trend(0, 0.7),
          trend(14 * DAY - 1, 0.8),
        ],
        window
      )[0]
    ).toMatchObject({
      sessionCount: 2,
      baselineNormalizedResult: 0.8,
      outcomeNormalizedResult: 1,
      weaknessChange: 0.2,
      baselineEvidenceCount: 2,
      outcomeEvidenceCount: 4,
      evidenceCount: 6,
      observationCount: 2,
    });
  });

  it('clips session counts to mid-week half-open boundaries', () => {
    expect(
      associateCategoryExposureWithLaterWeakness(
        [exposure(0, 'quads', [DAY, 3 * DAY, 5 * DAY])],
        [trend(4 * DAY, 0.8), trend(12 * DAY, 0.9)],
        {
          exposure: { start: 2 * DAY, end: 5 * DAY },
          outcome: { start: 5 * DAY, end: 14 * DAY },
        }
      )[0]
    ).toMatchObject({ sessionCount: 1, exposureWeekCount: 1, weaknessChange: 0.1 });
  });

  it('distinguishes no category exposure from no clear change', () => {
    expect(
      associateCategoryExposureWithLaterWeakness(
        [],
        [trend(7 * DAY, 0.8), trend(21 * DAY, 0.8)],
        window
      )[0]
    ).toMatchObject({ sessionCount: 0, weaknessChange: null, status: 'insufficient-data' });
  });

  it('combines category exposure and emits one result for every mapped category', () => {
    const posterior = (date: number, normalizedResult: number): WeaknessTrendPoint => ({
      ...trend(date, normalizedResult),
      quality: 'POSTERIOR_CHAIN',
    });
    expect(
      associateCategoryExposureWithLaterWeakness(
        [
          exposure(0, 'glutes', [0, DAY]),
          exposure(0, 'hamstrings', [0]),
          exposure(7 * DAY, 'hamstrings', [7 * DAY, 8 * DAY]),
          exposure(0, 'low-back', [0]),
        ],
        [posterior(7 * DAY, 0.8), posterior(21 * DAY, 0.9)],
        window
      ).map(({ category, sessionCount }) => ({ category, sessionCount }))
    ).toEqual([
      { category: 'glutes', sessionCount: 2 },
      { category: 'hamstrings', sessionCount: 3 },
      { category: 'low-back', sessionCount: 1 },
    ]);
  });

  it.each([
    ['overlapping periods', { exposure: { start: 0, end: 15 }, outcome: { start: 14, end: 20 } }],
    ['empty exposure period', { exposure: { start: 1, end: 1 }, outcome: { start: 2, end: 3 } }],
    ['empty outcome period', { exposure: { start: 0, end: 1 }, outcome: { start: 2, end: 2 } }],
    ['non-finite boundary', { exposure: { start: 0, end: 1 }, outcome: { start: 2, end: NaN } }],
  ])('rejects %s', (_, invalid) => {
    expect(() => associateCategoryExposureWithLaterWeakness([], [], invalid)).toThrow(RangeError);
  });
});
