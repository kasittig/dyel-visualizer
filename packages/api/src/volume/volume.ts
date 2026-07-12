import type { TaggedSetRecord } from '@dyel/pipeline';
import { convertWeight } from '../weightUnit';

export function calculateVolumeCorrelationFromTagged(
  records: TaggedSetRecord[],
  unit: 'lbs' | 'kg'
): Map<string, number> {
  const volumeByDate = new Map<string, number>();

  for (const r of records) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const tonnage = (r.sets ?? 1) * r.reps * convertWeight(r.weight, unit);
    volumeByDate.set(key, (volumeByDate.get(key) ?? 0) + tonnage);
  }

  return volumeByDate;
}
