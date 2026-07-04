import type { SetRecord, TagQuery } from '../types';

export interface ExerciseTagMapEntry {
  tags: string[];
  effects?: string[];
}

export type ExerciseTagMap = Record<string, ExerciseTagMapEntry>;
export type ExerciseAliasMap = Record<string, string>;

export type TaggedSetRecord = SetRecord & {
  canonical: string;
  tags: ReadonlySet<string>;
};

export function resolveCanonicalNames(records: SetRecord[], aliases: ExerciseAliasMap) {
  const unknown = new Set<string>();

  const resolved = records.reduce<SetRecord[]>((acc, r) => {
    const canonical = aliases[r.exercise];
    if (canonical) {
      acc.push({ ...r, exercise: canonical });
    } else {
      unknown.add(r.exercise);
    }
    return acc;
  }, []);

  return { resolved, unknown: [...unknown] };
}

export function tagRecords(records: SetRecord[], map: ExerciseTagMap) {
  const unknown = new Set<string>();
  const tagged = records.flatMap((r) => {
    const entry = map[r.exercise];
    if (!entry) {
      unknown.add(r.exercise);
      return [];
    }
    return [{ ...r, canonical: r.exercise, tags: new Set(entry.tags) }];
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
