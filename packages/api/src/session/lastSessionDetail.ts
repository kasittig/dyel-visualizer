import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches } from '@dyel/pipeline';
import { formatWeight, type DisplayUnit } from '../weightUnit';

export interface LastSessionDetail {
  date: string;
  sets: number;
  reps: number;
  weight: number;
  rpe: number | null;
}

export function buildLastSessionDetail(
  tagged: TaggedSetRecord[],
  liftType: string
): Map<string, LastSessionDetail> {
  const filtered = tagged.filter((r) => matches(r.tags, { all: [`lift:${liftType}`] }));
  const byDateAndLabel = Map.groupBy(
    filtered,
    (r) => `${r.date}::${r.meta?.rawExercise ?? r.canonical}`
  );

  const labelSessions = new Map<string, { date: number; records: TaggedSetRecord[] }>();
  for (const [key, records] of byDateAndLabel) {
    const [date, label] = key.split('::');
    const numDate = Number(date);
    const existing = labelSessions.get(label);
    if (!existing || numDate > existing.date) {
      labelSessions.set(label, { date: numDate, records });
    }
  }

  return new Map(
    Array.from(labelSessions, ([label, { date, records }]) => {
      const first = records[0]!;
      const sets = first.meta?.sets ? parseInt(first.meta.sets, 10) : records.length;
      const d = new Date(date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return [
        label,
        {
          date: dateStr,
          sets,
          reps: first.reps,
          weight: first.weight,
          rpe: first.rpe ?? null,
        },
      ];
    })
  );
}

export function buildLastSessionDetailForCanonical(
  tagged: TaggedSetRecord[],
  canonical: string
): LastSessionDetail | null {
  const filtered = tagged.filter((r) => r.canonical === canonical);
  if (filtered.length === 0) {
    return null;
  }

  const byDate = Map.groupBy(filtered, (r) => r.date);

  let maxDate = 0;
  let maxDateRecords: TaggedSetRecord[] = [];

  for (const [date, records] of byDate) {
    const numDate = Number(date);
    if (numDate > maxDate) {
      maxDate = numDate;
      maxDateRecords = records;
    }
  }

  if (maxDateRecords.length === 0) {
    return null;
  }

  const first = maxDateRecords[0]!;
  const sets = first.meta?.sets ? parseInt(first.meta.sets, 10) : maxDateRecords.length;
  const d = new Date(maxDate);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    date: dateStr,
    sets,
    reps: first.reps,
    weight: first.weight,
    rpe: first.rpe ?? null,
  };
}

export function formatLastSessionSummary(detail: LastSessionDetail, unit: DisplayUnit): string {
  const d = new Date(`${detail.date}T00:00:00`);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day} (${detail.sets}x${detail.reps} @ ${formatWeight(detail.weight, unit)})`;
}
