import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches } from '@dyel/pipeline';

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
      return [
        label,
        {
          date: new Date(date).toISOString().split('T')[0]!,
          sets,
          reps: first.reps,
          weight: first.weight,
          rpe: first.rpe ?? null,
        },
      ];
    })
  );
}
