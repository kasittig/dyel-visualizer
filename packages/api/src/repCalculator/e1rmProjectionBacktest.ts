import type { Point, TaggedSetRecord } from '@dyel/pipeline';
import { derivers, fitNormalizationModel } from '@dyel/pipeline';
import { resolveE1RMEstimate, findMostRecentFamilyE1RM } from './repCalculatorUtils';
import { canonicalLiftType } from '../exerciseUtils';

export interface BacktestEvent {
  canonical: string;
  date: number;
  actualE1RM: number;
  predictedBaseline: number | null;
  predictedFamilyRecent: number | null;
}

export interface BacktestSummary {
  events: BacktestEvent[];
  maeBaseline: number;
  maeFamilyRecent: number;
  winsBaseline: number;
  winsFamilyRecent: number;
  ties: number;
}

export function runE1RMProjectionBacktest(
  tagged: TaggedSetRecord[],
  groundTruthPoints: Point[],
  opts?: { minLookbackRecords?: number }
): BacktestSummary {
  const minLookbackRecords = opts?.minLookbackRecords ?? 5;
  const events: BacktestEvent[] = [];
  let baselineErrorSum = 0;
  let baselineErrorCount = 0;
  let familyErrorSum = 0;
  let familyErrorCount = 0;
  let winsBaseline = 0;
  let winsFamilyRecent = 0;
  let ties = 0;

  // Process each ground-truth point
  for (const gtPoint of groundTruthPoints) {
    const { series: canonical, t: date, v: actualE1RM } = gtPoint;

    // Truncate data to before this date
    const truncatedTagged = tagged.filter((r) => r.date < date);

    // Skip if not enough lookback records
    if (truncatedTagged.length < minLookbackRecords) {
      continue;
    }

    // Refit model with truncated data
    const truncatedModel = fitNormalizationModel(truncatedTagged, { minSamples: 1 });

    // Re-derive truncated e1rm-max-effort points from truncated data
    const dayGroups = Map.groupBy(
      truncatedTagged.filter((r) => r.canonical === canonical),
      (r) => r.date
    );
    const truncatedE1RMPoints: Point[] = Array.from(dayGroups.values())
      .map((daySets) => {
        const v = derivers['e1rm-max-effort'].derive(daySets);
        return v !== null
          ? { t: daySets[0].date, v, series: canonical, tags: daySets[0].tags }
          : null;
      })
      .filter((p): p is Point => p !== null);

    // Derive the target canonical's own lift-type family directly from its name, rather than
    // sampling an arbitrary record's tags (which may belong to an unrelated lift entirely).
    const liftTypeValue = canonicalLiftType(canonical);
    const liftTag = `lift:${liftTypeValue}`;

    // Compute baseline prediction
    let predictedBaseline: number | null = null;
    if (truncatedE1RMPoints.length > 0 && liftTypeValue !== 'accessory') {
      const estimate = resolveE1RMEstimate({
        liftType: liftTypeValue,
        targetCanonical: canonical,
        baselineName: canonical,
        today: new Date(date),
        model: truncatedModel,
        e1rmPoints: truncatedE1RMPoints,
      });
      if (estimate) {
        predictedBaseline = estimate.e1rm;
      }
    }

    // Compute family-recent prediction
    let predictedFamilyRecent: number | null = null;
    if (truncatedE1RMPoints.length > 0 && liftTypeValue !== 'accessory') {
      const baselineCanonical = truncatedModel.baseline[liftTag];
      if (baselineCanonical) {
        const familyPoints = truncatedE1RMPoints.filter(
          (p) => canonicalLiftType(p.series) === liftTypeValue
        );
        const estimate = findMostRecentFamilyE1RM(
          canonical,
          baselineCanonical,
          familyPoints,
          new Date(date),
          truncatedModel
        );
        if (estimate) {
          predictedFamilyRecent = estimate.e1rm;
        }
      }
    }

    // Record the event
    events.push({
      canonical,
      date,
      actualE1RM,
      predictedBaseline,
      predictedFamilyRecent,
    });

    // Accumulate errors and wins
    if (predictedBaseline !== null) {
      baselineErrorSum += Math.abs(predictedBaseline - actualE1RM);
      baselineErrorCount += 1;
    }

    if (predictedFamilyRecent !== null) {
      familyErrorSum += Math.abs(predictedFamilyRecent - actualE1RM);
      familyErrorCount += 1;
    }

    // Count wins only when both predictions are non-null
    if (predictedBaseline !== null && predictedFamilyRecent !== null) {
      const baselineError = Math.abs(predictedBaseline - actualE1RM);
      const familyError = Math.abs(predictedFamilyRecent - actualE1RM);

      if (baselineError < familyError) {
        winsBaseline += 1;
      } else if (familyError < baselineError) {
        winsFamilyRecent += 1;
      } else {
        ties += 1;
      }
    }
  }

  // Calculate mean absolute errors
  const maeBaseline = baselineErrorCount > 0 ? baselineErrorSum / baselineErrorCount : 0;
  const maeFamilyRecent = familyErrorCount > 0 ? familyErrorSum / familyErrorCount : 0;

  return {
    events,
    maeBaseline,
    maeFamilyRecent,
    winsBaseline,
    winsFamilyRecent,
    ties,
  };
}
