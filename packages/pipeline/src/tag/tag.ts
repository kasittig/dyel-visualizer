import { SetRecord, TagQuery } from '../types';

export interface ExerciseTagMapEntry {
  canonical: string;
  tags: string[];
  effects?: string[];
}

export type ExerciseTagMap = Record<string, ExerciseTagMapEntry>;

export type TaggedSetRecord = SetRecord & {
  canonical: string;
  tags: ReadonlySet<string>;
};

export function tagRecords(
  records: SetRecord[],
  map: ExerciseTagMap
): { tagged: TaggedSetRecord[]; unknown: string[] } {
  const tagged: TaggedSetRecord[] = [];
  const unknownSet = new Set<string>();

  for (const record of records) {
    const entry = map[record.exercise];
    if (entry) {
      tagged.push({
        ...record,
        canonical: entry.canonical,
        tags: new Set(entry.tags),
      });
    } else {
      unknownSet.add(record.exercise);
    }
  }

  return {
    tagged,
    unknown: Array.from(unknownSet),
  };
}

export function matches(tags: ReadonlySet<string>, q: TagQuery): boolean {
  if (q.all) {
    if (!q.all.every((tag) => tags.has(tag))) {
      return false;
    }
  }

  if (q.any) {
    if (!q.any.some((tag) => tags.has(tag))) {
      return false;
    }
  }

  if (q.none) {
    if (q.none.some((tag) => tags.has(tag))) {
      return false;
    }
  }

  return true;
}
