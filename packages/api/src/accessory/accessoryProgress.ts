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
}

const STALE_AFTER_DAYS = 21;

function toSession(date: number, records: TaggedSetRecord[]): Session {
  const detail = buildMostRecentSessionDetail(records)!;
  const sets = records[0]?.meta?.sets ? parseInt(records[0].meta.sets, 10) : records.length;
  const volume = records.every((record) => record.weight > 0)
    ? records.reduce((total, record) => total + record.weight * record.reps, 0) *
      (records.length === 1 ? sets : 1)
    : null;
  return { date, detail: { ...detail, sets }, volume };
}

/**
 * Sessions compare only when their set counts match. Reps may change within that same
 * structure, allowing a 3x10 -> 3x12 progression while rejecting 3x10 -> 4x8.
 * Load and volume changes are omitted for bodyweight/zero-load sessions.
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
  const previous = sessions[1] ?? null;
  const daysSinceLastPerformed = Math.max(
    0,
    Math.floor((now.getTime() - latest.date) / 86_400_000)
  );
  const comparable = previous?.detail.sets === latest.detail.sets ? previous : null;
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
      session.detail.sets === latest.detail.sets && session.detail.reps === latest.detail.reps
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
      : !previous
        ? 'new'
        : !comparable || !change
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
