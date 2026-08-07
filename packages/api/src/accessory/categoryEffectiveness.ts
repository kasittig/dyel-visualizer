import type { AccessoryCategory } from './accessoryCoverage';
import type { WeeklyAccessoryCategoryExposure } from './weeklyAccessoryExposure';
import type { WeaknessTrendPoint } from '../diagnostics/weaknessTrends';
import { mapWeaknessesToAccessoryCategories } from '../diagnostics/weaknessAccessoryCategories';

export type CategoryEffectivenessStatus =
  | 'insufficient-data'
  | 'possible-improvement'
  | 'no-clear-change'
  | 'possible-worsening';

export interface AnalysisPeriod {
  start: number;
  end: number;
}

export interface CategoryEffectivenessWindow {
  exposure: AnalysisPeriod;
  outcome: AnalysisPeriod;
}

export interface CategoryEffectivenessEvidence {
  category: AccessoryCategory;
  quality: string;
  exposurePeriod: AnalysisPeriod;
  outcomePeriod: AnalysisPeriod;
  sessionCount: number;
  exposureWeekCount: number;
  baselineNormalizedResult: number | null;
  outcomeNormalizedResult: number | null;
  weaknessChange: number | null;
  baselineEvidenceCount: number;
  outcomeEvidenceCount: number;
  evidenceCount: number;
  observationCount: number;
  status: CategoryEffectivenessStatus;
  interpretation: string;
}

/**
 * Associates category exposure with later quality observations. Periods are half-open [start, end),
 * and the exposure period must end no later than the outcome period begins.
 */
export function associateCategoryExposureWithLaterWeakness(
  exposure: readonly WeeklyAccessoryCategoryExposure[],
  trends: readonly WeaknessTrendPoint[],
  window: CategoryEffectivenessWindow
): CategoryEffectivenessEvidence[] {
  if (
    ![window.exposure.start, window.exposure.end, window.outcome.start, window.outcome.end].every(
      Number.isFinite
    ) ||
    window.exposure.start >= window.exposure.end ||
    window.outcome.start >= window.outcome.end ||
    window.exposure.end > window.outcome.start
  ) {
    throw new RangeError('Analysis periods must be valid and exposure must precede outcome.');
  }

  const exposureByCategory = new Map<
    AccessoryCategory,
    { sessionCount: number; weekCount: number }
  >();
  for (const point of exposure) {
    if (point.weekStart < window.exposure.start || point.weekStart >= window.exposure.end) {
      continue;
    }
    const total = exposureByCategory.get(point.category) ?? { sessionCount: 0, weekCount: 0 };
    total.sessionCount += point.sessionCount;
    total.weekCount += 1;
    exposureByCategory.set(point.category, total);
  }

  const trendsByQuality = Map.groupBy(trends, ({ quality }) => quality);
  const results: CategoryEffectivenessEvidence[] = [];
  for (const [quality, qualityTrends] of trendsByQuality) {
    const mapping = mapWeaknessesToAccessoryCategories([
      { effect: quality, belowCount: 1, aboveCount: 0 },
    ])[0];
    if (!mapping || mapping.status !== 'mapped') {
      continue;
    }

    let baseline: WeaknessTrendPoint | undefined;
    let outcome: WeaknessTrendPoint | undefined;
    let evidenceCount = 0;
    let observationCount = 0;
    for (const point of qualityTrends) {
      if (point.normalizedResult === null) {
        continue;
      }
      if (
        point.date >= window.exposure.start &&
        point.date < window.exposure.end &&
        (!baseline || point.date > baseline.date)
      ) {
        baseline = point;
      }
      if (point.date >= window.outcome.start && point.date < window.outcome.end) {
        if (!outcome || point.date > outcome.date) {
          outcome = point;
        }
        evidenceCount += point.evidenceCount;
        observationCount += 1;
      }
    }

    for (const category of mapping.categories) {
      const categoryExposure = exposureByCategory.get(category) ?? {
        sessionCount: 0,
        weekCount: 0,
      };
      const weaknessChange =
        categoryExposure.sessionCount > 0 && baseline && outcome
          ? Number((outcome.normalizedResult! - baseline.normalizedResult!).toFixed(6))
          : null;
      const status: CategoryEffectivenessStatus =
        weaknessChange === null
          ? 'insufficient-data'
          : weaknessChange > 0
            ? 'possible-improvement'
            : weaknessChange < 0
              ? 'possible-worsening'
              : 'no-clear-change';
      results.push({
        category,
        quality,
        exposurePeriod: { ...window.exposure },
        outcomePeriod: { ...window.outcome },
        sessionCount: categoryExposure.sessionCount,
        exposureWeekCount: categoryExposure.weekCount,
        baselineNormalizedResult: baseline?.normalizedResult ?? null,
        outcomeNormalizedResult: outcome?.normalizedResult ?? null,
        weaknessChange,
        baselineEvidenceCount: baseline?.evidenceCount ?? 0,
        outcomeEvidenceCount: evidenceCount,
        evidenceCount: (baseline?.evidenceCount ?? 0) + evidenceCount,
        observationCount,
        status,
        interpretation:
          status === 'insufficient-data'
            ? 'Insufficient data to assess an association.'
            : status === 'possible-improvement'
              ? 'Category exposure was followed by possible improvement.'
              : status === 'possible-worsening'
                ? 'Category exposure was followed by possible worsening.'
                : 'Category exposure was followed by no clear change.',
      });
    }
  }

  return results.sort(
    (a, b) => a.category.localeCompare(b.category) || a.quality.localeCompare(b.quality)
  );
}
