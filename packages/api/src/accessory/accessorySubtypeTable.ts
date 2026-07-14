import { matches, type TaggedSetRecord } from '@dyel/pipeline';
import { buildLastSessionDetail, type LastSessionDetail } from '../session/lastSessionDetail';

export type AccessorySubtype = 'upper' | 'lower' | 'core' | null;
export interface AccessoryTableRow {
  label: string;
  subtype: AccessorySubtype;
  lastSession: LastSessionDetail;
}

const SUBTYPES: Exclude<AccessorySubtype, null>[] = ['core', 'upper', 'lower'];

export function buildAccessoryTableRows(tagged: TaggedSetRecord[]): AccessoryTableRow[] {
  const lastSessionByLabel = buildLastSessionDetail(tagged, 'accessory');
  const filtered = tagged.filter((r) => matches(r.tags, { all: ['lift:accessory'] }));

  return Array.from(Map.groupBy(filtered, (r) => r.meta?.rawExercise ?? r.canonical))
    .reduce<AccessoryTableRow[]>((acc, [label, records]) => {
      const lastSession = lastSessionByLabel.get(label);
      if (!lastSession) {
        return acc;
      }

      const latestDate = Math.max(...records.map((r) => r.date));
      const latestTags = records.find((r) => r.date === latestDate)?.tags;
      const subtype = SUBTYPES.find((s) => latestTags?.has(`accessory:${s}`)) ?? null;

      acc.push({ label, subtype, lastSession });
      return acc;
    }, [])
    .sort((a, b) => a.label.localeCompare(b.label));
}
