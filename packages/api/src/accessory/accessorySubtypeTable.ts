import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches } from '@dyel/pipeline';
import { buildLastSessionDetail, type LastSessionDetail } from '../session/lastSessionDetail';

export type AccessorySubtype = 'upper' | 'lower' | 'core' | null;

export interface AccessoryTableRow {
  label: string;
  subtype: AccessorySubtype;
  lastSession: LastSessionDetail;
}

export function buildAccessoryTableRows(tagged: TaggedSetRecord[]): AccessoryTableRow[] {
  const lastSessionByLabel = buildLastSessionDetail(tagged, 'accessory');

  // Filter to accessory records and group by label
  const filtered = tagged.filter((r) => matches(r.tags, { all: ['lift:accessory'] }));
  const byLabel = Map.groupBy(filtered, (r) => r.meta?.rawExercise ?? r.canonical);

  const rows: AccessoryTableRow[] = [];

  for (const [label, labelRecords] of byLabel) {
    const lastSessionDetail = lastSessionByLabel.get(label);
    if (!lastSessionDetail) {
      continue; // Should not happen since both come from same filtered set
    }

    // Find the records belonging to the most recent date for this label
    const byDate = Map.groupBy(labelRecords, (r) => r.date);
    const maxDate = Math.max(...Array.from(byDate.keys(), Number));
    const maxDateRecords = byDate.get(maxDate)!;

    // Determine subtype from the most recent date's records
    const subtype: AccessorySubtype = maxDateRecords[0]!.tags.has('accessory:core')
      ? 'core'
      : maxDateRecords[0]!.tags.has('accessory:upper')
        ? 'upper'
        : maxDateRecords[0]!.tags.has('accessory:lower')
          ? 'lower'
          : null;

    rows.push({
      label,
      subtype,
      lastSession: lastSessionDetail,
    });
  }

  // Sort alphabetically by label for stable rendering
  rows.sort((a, b) => a.label.localeCompare(b.label));

  return rows;
}
