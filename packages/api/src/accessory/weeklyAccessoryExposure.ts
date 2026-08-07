import type { TaggedSetRecord } from '@dyel/pipeline';
import {
  ACCESSORY_CATEGORIES,
  classifyAccessory,
  type AccessoryCategory,
  type AccessoryCategoryMappings,
} from './accessoryCoverage';

export interface WeeklyAccessoryCategoryExposure {
  weekStart: number;
  category: AccessoryCategory;
  sessionCount: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Counts distinct UTC training dates per category in Monday-starting UTC calendar weeks. */
export function buildWeeklyAccessoryCategoryExposure(
  tagged: readonly TaggedSetRecord[],
  mappings: AccessoryCategoryMappings = {}
): WeeklyAccessoryCategoryExposure[] {
  const sessions = new Map<string, Set<number>>();

  for (const record of tagged) {
    if (!record.tags.has('lift:accessory')) {
      continue;
    }
    const { category } = classifyAccessory(record, mappings);
    if (!category) {
      continue;
    }

    const instant = new Date(record.date);
    const trainingDate = Date.UTC(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate()
    );
    const weekStart = trainingDate - ((instant.getUTCDay() + 6) % 7) * MS_PER_DAY;
    const key = `${weekStart}:${category}`;
    const dates = sessions.get(key) ?? new Set<number>();
    dates.add(trainingDate);
    sessions.set(key, dates);
  }

  const categoryOrder = new Map(ACCESSORY_CATEGORIES.map((category, index) => [category, index]));
  return Array.from(sessions, ([key, dates]) => {
    const separator = key.indexOf(':');
    return {
      weekStart: Number(key.slice(0, separator)),
      category: key.slice(separator + 1) as AccessoryCategory,
      sessionCount: dates.size,
    };
  }).sort(
    (a, b) =>
      a.weekStart - b.weekStart || categoryOrder.get(a.category)! - categoryOrder.get(b.category)!
  );
}
