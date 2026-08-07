import type { SetRecord } from '../types';

export interface ConflictingBodyweightsFinding {
  type: 'conflicting-bodyweights';
  valuesKg: number[];
}

export type DayContextFinding = ConflictingBodyweightsFinding;

export interface DayContext {
  date: number;
  bodyweightKg: number | null;
  notes: string[];
  findings: DayContextFinding[];
}

export function deriveDayContexts(records: SetRecord[]): DayContext[] {
  const grouped = Map.groupBy(records, ({ date }) => {
    const instant = new Date(date);
    return Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate());
  });

  return Array.from(grouped, ([date, dayRecords]) => {
    const bodyweights = new Set<number>();
    const notes = new Set<string>();

    for (const { meta } of dayRecords) {
      if (meta?.bodyweight !== undefined) {
        bodyweights.add(Number(meta.bodyweight));
      }
      if (meta?.notes?.trim()) {
        notes.add(meta.notes);
      }
    }

    const valuesKg = Array.from(bodyweights);
    return {
      date,
      bodyweightKg: valuesKg.length === 1 ? valuesKg[0] : null,
      notes: Array.from(notes),
      findings: valuesKg.length > 1 ? [{ type: 'conflicting-bodyweights', valuesKg }] : [],
    };
  });
}
