import type { SetRecord, TagQuery } from '../types';
import { parseExercise } from './detect/parseExercise';
import { buildCanonical, buildTagsAndEffects } from './detect/canonical';
import type { BaselineRange } from './detect/canonical';
import type { ParsedExercise, LiftType } from './detect/conjugate-types';
import { classifyAccessoryEffects, isCoreExercise } from './detect/detectors';
import { isSpeedWork } from '../derive/derivers';

export type TaggedSetRecord = SetRecord & {
  canonical: string;
  tags: ReadonlySet<string>;
  effects: readonly string[];
  baselineRange: BaselineRange | null;
};

function isUnknown(ex: ParsedExercise): boolean {
  return (
    ex.type === 'accessory' &&
    ex.bar === null &&
    ex.stance === null &&
    ex.equipment === null &&
    ex.addlWts.length === 0
  );
}

/**
 * Classifies a single exercise name string by parsing it and returning its lift type
 * and unknown status. Useful for simple exercise-name-to-type lookups (e.g., validators).
 *
 * A result is marked unknown when the exercise name does not match any recognized pattern
 * (is an unrecognized accessory or mistyped name).
 */
export function classifyExerciseName(name: string): { type: LiftType; isUnknown: boolean } {
  const ex = parseExercise(name);
  return {
    type: ex.type,
    isUnknown: isUnknown(ex),
  };
}

export function resolveCanonicalNames(records: SetRecord[]) {
  const unknown = new Set<string>();

  const resolved = records.reduce<SetRecord[]>((acc, r) => {
    const ex = parseExercise(r.exercise);
    if (isUnknown(ex)) {
      unknown.add(r.exercise);
      return acc;
    }
    acc.push({
      ...r,
      exercise: buildCanonical(ex, r.exercise),
      meta: { ...r.meta, rawExercise: r.exercise },
    });
    return acc;
  }, []);

  return { resolved, unknown: [...unknown] };
}

export function tagRecords(records: SetRecord[]) {
  const unknown = new Set<string>();
  const tagged = records.flatMap((r) => {
    // Re-parse the ORIGINAL raw name (preserved by resolveCanonicalNames), never the
    // canonical slug — a slug like "bench-close" doesn't reliably re-parse through the
    // same keyword detectors as its source text "Bench (CG)" and can silently lose
    // modifiers (see issue: close-grip bench was mis-tagged comp-lift this way).
    const rawExercise = r.meta?.rawExercise ?? r.exercise;
    const ex = parseExercise(rawExercise);
    if (isUnknown(ex)) {
      unknown.add(rawExercise);
      return [];
    }
    const { tags, effects, range } = buildTagsAndEffects(rawExercise);
    return [{ ...r, canonical: r.exercise, tags, effects, baselineRange: range }];
  });

  return { tagged, unknown: [...unknown] };
}

/**
 * Builds real TaggedSetRecords for exercise names that resolveCanonicalNames/tagRecords
 * flagged as "unknown" (i.e. every genuine accessory exercise, per the unknown heuristic).
 * Unlike resolveCanonicalNames/tagRecords, this does NOT filter — it's the intentional
 * counterpart that keeps accessory data (canonical + lift:accessory tag) flowing into
 * PipelineModel.tagged for downstream consumers (e.g. @dyel/api's accessory lift-type tab),
 * while resolveCanonicalNames/tagRecords keep reporting the same names via `unknown` for
 * offline review, unchanged.
 */
export function buildAccessoryTaggedRecords(
  records: SetRecord[],
  unknownNames: string[]
): TaggedSetRecord[] {
  const unknownSet = new Set(unknownNames);
  return records
    .filter((r) => unknownSet.has(r.exercise))
    .map((r) => {
      const ex = parseExercise(r.exercise);
      const { tags, effects, range } = buildTagsAndEffects(r.exercise);
      return {
        ...r,
        canonical: buildCanonical(ex, r.exercise),
        tags,
        effects,
        baselineRange: range,
        meta: { ...r.meta, rawExercise: r.exercise },
      };
    });
}

/**
 * Classifies records using both the parsed exercise family and the athlete's history.
 * A squat/bench/deadlift candidate is promoted only when the same canonical variation
 * has at least one 1-3 rep set at RPE 9+ (or with no RPE recorded). All other records
 * remain available as accessories. Unknown names are reported independently from that
 * promotion decision so a recognized-but-unpromoted variation is not a validation error.
 */
export function tagRecordsByPrimaryEvidence(records: SetRecord[]): {
  tagged: TaggedSetRecord[];
  primaryTagged: TaggedSetRecord[];
  unknown: string[];
} {
  const candidates = records.map((record) => {
    const parsed = parseExercise(record.exercise);
    return {
      record,
      parsed,
      canonical: buildCanonical(parsed, record.exercise),
    };
  });
  const primaryCanonicals = new Set<string>();
  const unknown = new Set<string>();

  for (const { record, parsed, canonical } of candidates) {
    if (isUnknown(parsed)) {
      unknown.add(record.exercise);
    } else if (
      (record.reps === 1 || record.reps === 2 || record.reps === 3) &&
      (record.rpe === undefined || record.rpe >= 9) &&
      !isSpeedWork(record)
    ) {
      primaryCanonicals.add(canonical);
    }
  }

  const tagged = candidates.map(({ record, parsed, canonical }) => {
    const rawExercise = record.exercise;
    if (parsed.type !== 'accessory' && primaryCanonicals.has(canonical)) {
      const { tags, effects, range } = buildTagsAndEffects(rawExercise);
      return {
        ...record,
        exercise: canonical,
        canonical,
        tags,
        effects,
        baselineRange: range,
        meta: { ...record.meta, rawExercise },
      };
    }
    return {
      ...record,
      exercise: canonical,
      canonical,
      tags: new Set(['lift:accessory']),
      effects: classifyAccessoryEffects(rawExercise),
      baselineRange: null,
      meta: { ...record.meta, rawExercise },
    };
  });

  return {
    tagged,
    primaryTagged: tagged.filter((record) => !record.tags.has('lift:accessory')),
    unknown: [...unknown],
  };
}

export function classifyAccessorySubtypes(tagged: TaggedSetRecord[]): TaggedSetRecord[] {
  const byDate = Map.groupBy(tagged, (r) => r.date);
  return tagged.map((r) => {
    if (!r.tags.has('lift:accessory')) {
      return r;
    }
    const rawName = r.meta?.rawExercise ?? r.canonical;
    if (isCoreExercise(rawName)) {
      return { ...r, tags: new Set([...r.tags, 'accessory:core']) };
    }
    const daySets = byDate.get(r.date)!;
    const hasBench = daySets.some((d) => d.tags.has('lift:bench'));
    const hasLower = daySets.some((d) => d.tags.has('lift:squat') || d.tags.has('lift:deadlift'));
    const subtype = hasBench && !hasLower ? 'upper' : hasLower && !hasBench ? 'lower' : null;
    return subtype ? { ...r, tags: new Set([...r.tags, `accessory:${subtype}`]) } : r;
  });
}

export function matches(tags: ReadonlySet<string>, q: TagQuery): boolean {
  if (q.all && !q.all.every((t) => tags.has(t))) {
    return false;
  }
  if (q.any && !q.any.some((t) => tags.has(t))) {
    return false;
  }
  if (q.none && q.none.some((t) => tags.has(t))) {
    return false;
  }
  return true;
}
