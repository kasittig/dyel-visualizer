import {
  derivers,
  diagnose,
  fitNormalizationModel,
  tagRecordsByPrimaryEvidence,
  type PipelineModel,
  type Point,
  type SetRecord,
  type TaggedSetRecord,
  type VariantAssessment,
} from '@dyel/pipeline';

export type WeaknessTrendStatus = 'improving' | 'unchanged' | 'worsening' | 'insufficient-history';

export interface WeaknessTrendContributor {
  canonical: string;
  status: VariantAssessment['status'] | 'unassessed';
  ratio: number | null;
  latestAt: number | null;
}

export interface WeaknessTrendPoint {
  date: number;
  quality: string;
  normalizedResult: number | null;
  status: WeaknessTrendStatus;
  contributingVariations: WeaknessTrendContributor[];
  evidenceCount: number;
  staleEvidenceCount: number;
  unassessedCount: number;
}

const toSourceRecord = (record: TaggedSetRecord): SetRecord => ({
  date: record.date,
  exercise: record.meta?.rawExercise ?? record.exercise,
  weight: record.weight,
  reps: record.reps,
  ...(record.rpe === undefined ? {} : { rpe: record.rpe }),
  ...(record.sets === undefined ? {} : { sets: record.sets }),
  meta: record.meta,
});

/** Caps synchronous historical replay to the most recent year of weekly-equivalent observations. */
export const MAX_WEAKNESS_TREND_DATES = 52;

/**
 * Replays diagnostics at each max-effort observation date using only records available at that
 * cutoff. The current model and its diagnostics are never mutated.
 */
export function deriveHistoricalWeaknessTrends(model: PipelineModel): WeaknessTrendPoint[] {
  const sourceRecords = model.tagged.map(toSourceRecord).sort((a, b) => a.date - b.date);
  const dates = Array.from(new Set(sourceRecords.map(({ date }) => date))).sort((a, b) => a - b);
  const retainedDates = new Set(dates.slice(-MAX_WEAKNESS_TREND_DATES));
  const previousByQuality = new Map<string, number>();
  const points: WeaknessTrendPoint[] = [];
  const cutoffRecords: SetRecord[] = [];
  let sourceIndex = 0;

  for (const date of dates) {
    while (sourceRecords[sourceIndex]?.date === date) {
      cutoffRecords.push(sourceRecords[sourceIndex]);
      sourceIndex += 1;
    }
    if (!retainedDates.has(date)) {
      continue;
    }
    const { primaryTagged } = tagRecordsByPrimaryEvidence(cutoffRecords);
    const groups = Map.groupBy(primaryTagged, (record) => `${record.date}::${record.canonical}`);
    const e1rmPoints: Point[] = [];
    let hasObservationAtCutoff = false;
    for (const records of groups.values()) {
      const value = derivers['e1rm-max-effort'].derive(records);
      if (value !== null) {
        e1rmPoints.push({
          t: records[0].date,
          v: value,
          series: records[0].canonical,
          tags: records[0].tags,
        });
        hasObservationAtCutoff ||= records[0].date === date;
      }
    }
    if (!hasObservationAtCutoff) {
      continue;
    }

    const normalization = fitNormalizationModel(primaryTagged, { minSamples: 1 });
    const effectsByCanonical = new Map(
      primaryTagged.map((record) => [record.canonical, [...record.effects]])
    );
    const displayNameByCanonical = new Map(
      primaryTagged.map((record) => [
        record.canonical,
        record.meta?.rawExercise ?? record.canonical,
      ])
    );
    const baselineRangeByCanonical = new Map(
      primaryTagged.flatMap((record) =>
        record.baselineRange ? [[record.canonical, record.baselineRange] as const] : []
      )
    );
    const report = diagnose(
      e1rmPoints,
      normalization,
      effectsByCanonical,
      { tolerance: 0.05, staleDays: 90 },
      date,
      displayNameByCanonical,
      baselineRangeByCanonical
    );
    const variantsByCanonical = new Map(
      report.variants.map((variant) => [variant.canonical, variant])
    );
    const unassessedCanonicals = new Set(report.unassessed.map(({ canonical }) => canonical));
    const qualities = new Set<string>();
    for (const record of primaryTagged) {
      for (const effect of record.effects) {
        qualities.add(effect);
      }
    }
    for (const quality of Array.from(qualities).sort()) {
      const contributingVariations: WeaknessTrendContributor[] = [];
      let ratioTotal = 0;
      let evidenceCount = 0;
      let staleEvidenceCount = 0;
      let unassessedCount = 0;
      for (const [canonical, effects] of effectsByCanonical) {
        if (!effects.includes(quality)) {
          continue;
        }
        const variant = variantsByCanonical.get(canonical);
        if (variant) {
          contributingVariations.push({
            canonical,
            status: variant.status,
            ratio: variant.ratio,
            latestAt: variant.latestAt,
          });
          if (variant.status === 'stale') {
            staleEvidenceCount += 1;
          } else {
            ratioTotal += variant.ratio;
            evidenceCount += 1;
          }
        } else if (unassessedCanonicals.has(canonical)) {
          contributingVariations.push({
            canonical,
            status: 'unassessed',
            ratio: null,
            latestAt: null,
          });
          unassessedCount += 1;
        }
      }
      contributingVariations.sort((a, b) => a.canonical.localeCompare(b.canonical));

      const normalizedResult = evidenceCount ? ratioTotal / evidenceCount : null;
      const previous = previousByQuality.get(quality);
      const status: WeaknessTrendStatus =
        normalizedResult === null || previous === undefined
          ? 'insufficient-history'
          : normalizedResult > previous
            ? 'improving'
            : normalizedResult < previous
              ? 'worsening'
              : 'unchanged';
      if (normalizedResult !== null) {
        previousByQuality.set(quality, normalizedResult);
      }
      points.push({
        date,
        quality,
        normalizedResult,
        status,
        contributingVariations,
        evidenceCount,
        staleEvidenceCount,
        unassessedCount,
      });
    }
  }

  return points;
}
