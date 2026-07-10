import type { TaggedSetRecord } from '@dyel/pipeline';
import { matches } from '@dyel/pipeline';

export function buildCanonicalByLabel(
  tagged: TaggedSetRecord[],
  liftType: string
): Map<string, string> {
  const canonicalByLabel = new Map<string, string>();
  const dateByLabel = new Map<string, number>();
  for (const r of tagged) {
    if (!matches(r.tags, { all: [`lift:${liftType}`] })) {
      continue;
    }
    const label = r.meta?.rawExercise ?? r.canonical;
    const currentDate = dateByLabel.get(label) ?? -Infinity;
    if (r.date > currentDate) {
      dateByLabel.set(label, r.date);
      canonicalByLabel.set(label, r.canonical);
    }
  }
  return canonicalByLabel;
}

export function resolveTargetLabel(
  tagged: TaggedSetRecord[],
  liftType: string,
  targetCanonical?: string
): string | undefined {
  let targetLabel: string | undefined;
  let targetDate = -Infinity;
  for (const r of tagged) {
    if (r.canonical !== targetCanonical || !matches(r.tags, { all: [`lift:${liftType}`] })) {
      continue;
    }
    if (r.date > targetDate) {
      targetDate = r.date;
      targetLabel = r.meta?.rawExercise ?? r.canonical;
    }
  }
  return targetLabel;
}
