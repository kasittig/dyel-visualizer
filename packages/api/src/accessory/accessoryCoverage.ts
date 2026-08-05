import type { TaggedSetRecord } from '@dyel/pipeline';
import { isRecordInDateRange } from '../dateRange/dateRangeUtils';

export const ACCESSORY_CATEGORIES = [
  'upper-push',
  'upper-pull',
  'triceps',
  'biceps',
  'shoulders',
  'quads',
  'hamstrings',
  'glutes',
  'low-back',
  'core',
  'carries',
  'conditioning',
] as const;

export type AccessoryCategory = (typeof ACCESSORY_CATEGORIES)[number];
export type AccessoryClassificationSource = 'user' | 'heuristic' | 'legacy-tag' | 'unclassified';
export type AccessoryClassificationConfidence = 'high' | 'medium' | 'low' | 'none';
export interface AccessoryClassification {
  category: AccessoryCategory | null;
  source: AccessoryClassificationSource;
  confidence: AccessoryClassificationConfidence;
}
export type AccessoryCategoryMappings = Readonly<Record<string, AccessoryCategory>>;
export interface AccessoryCoverage {
  category: AccessoryCategory;
  sessionCount: number;
  volume: number;
}

const RULES: readonly [AccessoryCategory, RegExp, AccessoryClassificationConfidence][] = [
  [
    'core',
    /\b(ab(?:s)?|core|plank|crunch(?:es)?|sit[ -]?up|russian twist|leg raise|pallof|palloffs?|wood ?chop|dead bug|v[ -]?up)\b/,
    'high',
  ],
  ['carries', /\b(?:farmer'?s?|suitcase|overhead) (?:carr(?:y|ies)|walk)\b|\byoke walk\b/, 'high'],
  [
    'conditioning',
    /\b(?:sled (?:drag|push)|prowler|bike|rowing machine|run(?:ning)?|sprint(?:s)?|burpee(?:s)?)\b/,
    'high',
  ],
  ['triceps', /\b(?:triceps?|push[ -]?down|skull ?crusher|jm press)\b/, 'high'],
  [
    'biceps',
    /\b(?:biceps?|hammer curl|preacher curl|db curl|dumbbell curl|barbell curl)\b/,
    'high',
  ],
  ['shoulders', /\b(?:lateral|front|rear delt) raise\b|\b(?:face ?pull|delt(?:oid)?s?)\b/, 'high'],
  ['upper-pull', /\b(?:row|pulldown|pull[ -]?up|chin[ -]?up)s?\b/, 'high'],
  [
    'upper-push',
    /\b(?:push[ -]?up|dip|chest press|overhead press|shoulder press|flye?s?)s?\b/,
    'medium',
  ],
  ['quads', /\b(?:leg press|leg extension|split squat|lunge|step[ -]?up|hack squat)s?\b/, 'high'],
  ['hamstrings', /\b(?:hamstring curl|leg curl|nordic|glute ham raise|ghr)s?\b/, 'high'],
  ['glutes', /\b(?:hip thrust|glute bridge|kickback)s?\b/, 'high'],
  [
    'low-back',
    /\b(?:45 back raise|back extension|rev\.? hyper|reverse hyper|hyperextension|good morning)s?\b/,
    'high',
  ],
];

export function classifyAccessory(
  record: TaggedSetRecord,
  mappings: AccessoryCategoryMappings = {}
): AccessoryClassification {
  const raw = record.meta?.rawExercise ?? record.canonical ?? record.exercise;
  const identity = record.canonical || raw;
  const mapped = mappings[identity] ?? mappings[raw];
  if (mapped) return { category: mapped, source: 'user', confidence: 'high' };

  const normalized = raw
    .toLowerCase()
    .replace(/[()_,/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = RULES.find(([, pattern]) => pattern.test(normalized));
  if (match) return { category: match[0], source: 'heuristic', confidence: match[2] };

  // Retain the old explicit core tag as a low-confidence migration fallback. Upper/lower tags
  // were inferred from the day's primary lift, so they are intentionally not promoted into the
  // more specific taxonomy.
  return record.tags.has('accessory:core')
    ? { category: 'core', source: 'legacy-tag', confidence: 'low' }
    : { category: null, source: 'unclassified', confidence: 'none' };
}

export function buildAccessoryCoverage(
  tagged: TaggedSetRecord[],
  from?: Date,
  to?: Date,
  mappings: AccessoryCategoryMappings = {}
): AccessoryCoverage[] {
  const categories = new Map<AccessoryCategory, { dates: Set<number>; volume: number }>();
  for (const record of tagged) {
    if (!record.tags.has('lift:accessory') || !isRecordInDateRange(record.date, from, to)) continue;
    const { category } = classifyAccessory(record, mappings);
    if (!category) continue;
    const summary = categories.get(category) ?? { dates: new Set<number>(), volume: 0 };
    summary.dates.add(record.date);
    summary.volume += record.weight * record.reps;
    categories.set(category, summary);
  }
  return ACCESSORY_CATEGORIES.flatMap((category) => {
    const summary = categories.get(category);
    return summary ? [{ category, sessionCount: summary.dates.size, volume: summary.volume }] : [];
  });
}
