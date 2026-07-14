import type { SetRecord, TagQuery } from '../types';
import { parseExercise } from './detect/parseExercise';
import { buildCanonical, buildTagsAndEffects } from './detect/canonical';
import type { BaselineRange } from './detect/canonical';
import type { ParsedExercise, LiftType } from './detect/conjugate-types';
import { isCoreExercise } from './detect/detectors';

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

export function tagRecords(records: SetRecord[], deadliftStance: 'sumo' | 'conventional' = 'sumo') {
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
    const { tags, effects, range } = buildTagsAndEffects(rawExercise, deadliftStance);
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
  unknownNames: string[],
  deadliftStance: 'sumo' | 'conventional' = 'sumo'
): TaggedSetRecord[] {
  const unknownSet = new Set(unknownNames);
  return records
    .filter((r) => unknownSet.has(r.exercise))
    .map((r) => {
      const ex = parseExercise(r.exercise);
      const { tags, effects, range } = buildTagsAndEffects(r.exercise, deadliftStance);
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
