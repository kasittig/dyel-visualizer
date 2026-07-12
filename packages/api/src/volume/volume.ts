import type { TaggedSetRecord } from '@dyel/pipeline';

export function calculateVolumeCorrelationFromTagged(
  records: TaggedSetRecord[],
  unit: 'lbs' | 'kg'
): Map<string, number> {
  const volumeByDate = new Map<string, number>();
  const scalar = unit === 'lbs' ? 2.20462262185 : 1;

  for (const r of records) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const tonnage = (r.sets ?? 1) * r.reps * r.weight * scalar;
    volumeByDate.set(key, (volumeByDate.get(key) ?? 0) + tonnage);
  }

  return volumeByDate;
}
