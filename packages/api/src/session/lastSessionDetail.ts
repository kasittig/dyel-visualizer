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

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getSets = (first: TaggedSetRecord, len: number) =>
  first.meta?.sets ? parseInt(first.meta.sets, 10) : len;

function getLatestSession(
  records: TaggedSetRecord[]
): { maxDate: number; maxRecs: TaggedSetRecord[] } | null {
  if (!records.length) {
    return null;
  }
  const groups = Map.groupBy(records, (r) => r.date);
  const maxDate = Math.max(...Array.from(groups.keys(), Number));
  return { maxDate, maxRecs: groups.get(maxDate)! };
}

export function buildLastSessionDetail(
  tagged: TaggedSetRecord[],
  liftType: string
): Map<string, LastSessionDetail> {
  const filtered = tagged.filter((r) => matches(r.tags, { all: [`lift:${liftType}`] }));
  const byLabel = Map.groupBy(filtered, (r) => r.meta?.rawExercise ?? r.canonical);

  return new Map(
    Array.from(byLabel, ([label, recs]) => {
      const { maxDate, maxRecs } = getLatestSession(recs)!;
      const first = maxRecs[0]!;
      return [
        label,
        {
          date: fmtDate(new Date(maxDate)),
          sets: getSets(first, maxRecs.length),
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
  const session = getLatestSession(tagged.filter((r) => r.canonical === canonical));
  if (!session) {
    return null;
  }

  const first = session.maxRecs[0]!;
  return {
    date: fmtDate(new Date(session.maxDate)),
    sets: getSets(first, session.maxRecs.length),
    reps: first.reps,
    weight: first.weight,
    rpe: first.rpe ?? null,
  };
}

export function buildMostRecentSessionDetail(tagged: TaggedSetRecord[]): LastSessionDetail | null {
  const session = getLatestSession(tagged);
  if (!session) {
    return null;
  }

  const first = session.maxRecs[0]!;
  return {
    date: fmtDate(new Date(session.maxDate)),
    sets: getSets(first, session.maxRecs.length),
    reps: first.reps,
    weight: first.weight,
    rpe: first.rpe ?? null,
  };
}

export function buildSessionCountForCanonical(
  tagged: TaggedSetRecord[],
  canonical: string
): number {
  const sessionDates = new Set<number>();
  for (const r of tagged) {
    if (r.canonical === canonical) {
      sessionDates.add(r.date);
    }
  }
  return sessionDates.size;
}

export function formatLastSessionParts(
  detail: LastSessionDetail,
  unit: DisplayUnit
): { date: string; setLine: string } {
  const d = new Date(`${detail.date}T00:00:00`);
  const date = `${d.getMonth() + 1}/${d.getDate()}`;
  const setLine = `${detail.sets}x${detail.reps} @ ${formatWeight(detail.weight, unit)}`;
  return { date, setLine };
}

export function formatLastSessionSummary(
  detail: LastSessionDetail,
  unit: DisplayUnit,
  opts?: { multiline?: boolean }
): string {
  const { date, setLine } = formatLastSessionParts(detail, unit);
  return opts?.multiline ? `${date}\n${setLine}` : `${date} (${setLine})`;
}
