import type { SetRecord, TagQuery } from '../types';
import { parseExercise } from './detect/parseExercise';
import { buildCanonical, buildTagsAndEffects } from './detect/canonical';
import type { ParsedExercise } from './detect/conjugate-types';

export type TaggedSetRecord = SetRecord & {
  canonical: string;
  tags: ReadonlySet<string>;
  effects: readonly string[];
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
    const { tags, effects } = buildTagsAndEffects(ex);
    return [{ ...r, canonical: r.exercise, tags, effects }];
  });

  return { tagged, unknown: [...unknown] };
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
