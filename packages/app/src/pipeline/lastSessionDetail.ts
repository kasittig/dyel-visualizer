import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches } from '@dyel/pipeline';

export interface LastSessionDetail {
  date: string;
  sets: number;
  reps: number;
  weight: number;
  rpe: number | null;
}

/**
 * Builds a map of per-variation last session details from tagged records.
 * Groups records by variation label (raw exercise name), finds the most recent date
 * per label, and extracts session metrics (date, set count, reps, weight, RPE).
 *
 * This is pipeline-native equivalent to SessionStats.lastSession, but keyed by
 * variation label string (raw exercise) instead of display name, with minimal
 * structure (no e1RM computation here — that's the caller's concern).
 */
export function buildLastSessionDetail(
  tagged: TaggedSetRecord[],
  liftType: string
): Map<string, LastSessionDetail> {
  // Filter to the target lift type
  const filtered = tagged.filter((r) => matches(r.tags, { all: [`lift:${liftType}`] }));

  // Group by date + variation label (raw exercise name or canonical fallback)
  const byDateAndLabel = Map.groupBy(filtered, (r) => {
    const label = r.meta?.rawExercise ?? r.canonical;
    return `${r.date}::${label}`;
  });

  // For each label, find the most recent session and extract details
  const labelSessions = new Map<string, { date: number; records: TaggedSetRecord[] }>();

  for (const [key, records] of byDateAndLabel) {
    const [date, label] = key.split('::');
    const numDate = Number(date);

    const existing = labelSessions.get(label);
    if (!existing || numDate > existing.date) {
      labelSessions.set(label, { date: numDate, records });
    }
  }

  // Build the output map
  return new Map(
    [...labelSessions].map(([label, { date, records }]) => {
      const first = records[0]!;
      // Try to get sets count from meta, otherwise use record count
      const setsValue = first.meta?.sets ? parseInt(first.meta.sets, 10) : records.length;
      return [
        label,
        {
          date: new Date(date).toISOString().split('T')[0]!,
          sets: setsValue,
          reps: first.reps,
          weight: first.weight,
          rpe: first.rpe ?? null,
        },
      ];
    })
  );
}
