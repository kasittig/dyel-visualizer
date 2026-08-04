import type { TaggedSetRecord } from '@dyel/pipeline';
import { buildMostRecentSessionDetail, type LastSessionDetail } from '../session/lastSessionDetail';

export type AccessoryProgressStatus =
  | 'new'
  | 'progressing'
  | 'flat'
  | 'regressing'
  | 'stale'
  | 'insufficient-history';

export interface AccessoryProgress {
  /** Accessory progress always considers the exercise's complete recorded history. */
  scope: 'all-time';
  status: AccessoryProgressStatus;
  latest: LastSessionDetail;
  previous: LastSessionDetail | null;
  /** The best session with the latest session's exact set/rep scheme, if weighted. */
  best: LastSessionDetail | null;
  daysSinceLastPerformed: number;
  change: { load: number | null; reps: number | null; volume: number | null } | null;
}

interface Session {
  date: number;
  detail: LastSessionDetail;
  volume: number | null;
  isComparable: boolean;
}

const STALE_AFTER_DAYS = 21;

function toSession(date: number, records: TaggedSetRecord[]): Session {
  const detail = buildMostRecentSessionDetail(records)!;
  const setCounts = records.map((record) => {
    const sets = record.meta?.sets ? parseInt(record.meta.sets, 10) : 1;
    return Number.isFinite(sets) && sets > 0 ? sets : 1;
  });
  const sets = setCounts.reduce((total, count) => total + count, 0);
  const volume = records.every((record) => record.weight > 0)
    ? records.reduce(
        (total, record, index) => total + record.weight * record.reps * setCounts[index]!,
        0
      )
    : null;
  const isComparable =
    new Set(records.map((record) => `${record.reps}:${record.weight}`)).size === 1;
  return { date, detail: { ...detail, sets }, volume, isComparable };
}

/**
 * Sessions compare only when every row in each session has the same load and reps, and the
 * total set counts match. Reps may change between otherwise comparable sessions, allowing a
 * 3x10 -> 3x12 progression while rejecting 3x10 -> 4x8. Load and volume changes are omitted
 * for bodyweight/zero-load sessions.
 */
export function buildAccessoryProgress(
  records: TaggedSetRecord[],
  now = new Date()
): AccessoryProgress | null {
  if (!records.length) {
    return null;
  }

  const sessions = Array.from(
    Map.groupBy(records, (record) => record.date),
    ([date, items]) => toSession(date, items)
  ).sort((a, b) => b.date - a.date);
  const latest = sessions[0]!;
  const previous = latest.isComparable
    ? (sessions.find(
        (session, index) =>
          index > 0 && session.isComparable && session.detail.sets === latest.detail.sets
      ) ?? null)
    : null;
  const daysSinceLastPerformed = Math.max(
    0,
    Math.floor((now.getTime() - latest.date) / 86_400_000)
  );
  const comparable = previous;
  const change = comparable
    ? {
        load:
          latest.detail.weight > 0 && comparable.detail.weight > 0
            ? latest.detail.weight - comparable.detail.weight
            : null,
        reps: latest.detail.reps - comparable.detail.reps,
        volume:
          latest.volume !== null && comparable.volume !== null
            ? latest.volume - comparable.volume
            : null,
      }
    : null;
  const sameScheme = sessions.filter(
    (session) =>
      session.detail.sets === latest.detail.sets &&
      session.detail.reps === latest.detail.reps &&
      session.isComparable
  );
  const best =
    sameScheme.reduce<Session | null>(
      (current, session) =>
        session.detail.weight > 0 && (!current || session.detail.weight > current.detail.weight)
          ? session
          : current,
      null
    )?.detail ?? null;
  const status: AccessoryProgressStatus =
    daysSinceLastPerformed > STALE_AFTER_DAYS
      ? 'stale'
      : sessions.length === 1
        ? 'new'
        : !latest.isComparable || !comparable || !change
          ? 'insufficient-history'
          : (change.volume ?? change.reps) > 0
            ? 'progressing'
            : (change.volume ?? change.reps) < 0
              ? 'regressing'
              : 'flat';

  return {
    scope: 'all-time',
    status,
    latest: latest.detail,
    previous: previous?.detail ?? null,
    best,
    daysSinceLastPerformed,
    change,
  };
}
