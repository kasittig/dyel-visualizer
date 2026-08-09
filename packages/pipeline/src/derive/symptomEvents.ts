import type { DayContext } from './dayContext';

export type SymptomSide = 'left' | 'right' | 'bilateral';
export type SymptomTiming = 'during-training' | 'after-training' | 'next-day';

export interface SymptomEvent {
  date: number;
  sourceText: string;
  matchedText: string;
  region?: string;
  side?: SymptomSide;
  severityOutOf10?: number;
  limitation?: string;
  relatedExercise?: string;
  timing?: SymptomTiming;
}

const REGIONS: Readonly<Record<string, string>> = {
  ankle: 'ankle',
  back: 'back',
  calf: 'calf',
  elbow: 'elbow',
  glute: 'glute',
  groin: 'groin',
  hamstring: 'hamstring',
  hip: 'hip',
  knee: 'knee',
  neck: 'neck',
  quad: 'quadriceps',
  quadriceps: 'quadriceps',
  shoulder: 'shoulder',
  wrist: 'wrist',
};

const EXERCISES: Readonly<Record<string, string>> = {
  bench: 'bench press',
  'bench press': 'bench press',
  deadlift: 'deadlift',
  deadlifts: 'deadlift',
  press: 'overhead press',
  row: 'row',
  rows: 'row',
  squat: 'squat',
  squats: 'squat',
};

const REGION_PATTERN = new RegExp(`\\b(${Object.keys(REGIONS).join('|')})s?\\b`, 'i');
const EXERCISE_PATTERN = new RegExp(`\\b(${Object.keys(EXERCISES).join('|')})\\b`, 'i');
const RELATED_EXERCISE_PATTERN = new RegExp(
  `\\b(?:after|during|on|while)\\s+(?:the\\s+)?(${Object.keys(EXERCISES).join('|')})\\b`,
  'i'
);
const SYMPTOM_PATTERN =
  /\b(?:ache[ds]?|aching|discomfort|hurt(?:ing|s)?|pain(?:ful)?|sore(?:ness)?|stiff(?:ness)?|tender(?:ness)?|tight(?:ness)?)\b/i;
const SEVERITY_PATTERN = /\b(10|[0-9])\s*\/\s*10\b/;
const NEGATIONS = new Set(['no', 'not', 'never', 'without']);
const SYMPTOMS = new Set([
  'ache',
  'ached',
  'aches',
  'aching',
  'discomfort',
  'hurt',
  'hurting',
  'hurts',
  'pain',
  'painful',
  'sore',
  'soreness',
  'stiff',
  'stiffness',
  'tender',
  'tenderness',
  'tight',
  'tightness',
]);
const LIMITATION_PREFIXES = [
  "couldn't",
  'could not',
  'unable to',
  'had to',
  'stopped',
  'cut',
  'limited',
];

const hasNegatedSymptom = (text: string): boolean => {
  const words = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  for (let index = 0; index < words.length; index += 1) {
    if (!NEGATIONS.has(words[index])) {
      continue;
    }
    for (let offset = 1; offset <= 3 && index + offset < words.length; offset += 1) {
      if (SYMPTOMS.has(words[index + offset])) {
        return true;
      }
    }
  }
  return false;
};

const extractLimitation = (text: string): string | undefined => {
  const normalized = text.toLowerCase();
  let start = -1;
  for (const prefix of LIMITATION_PREFIXES) {
    let candidate = normalized.indexOf(prefix);
    while (
      candidate >= 0 &&
      ((candidate > 0 && /[a-z]/.test(normalized[candidate - 1])) ||
        /[a-z]/.test(normalized[candidate + prefix.length] ?? ''))
    ) {
      candidate = normalized.indexOf(prefix, candidate + prefix.length);
    }
    if (candidate >= 0 && (start < 0 || candidate < start)) {
      start = candidate;
    }
  }
  if (start < 0) {
    return undefined;
  }
  let end = text.length;
  for (const delimiter of [',', '.', ';', '!', '?']) {
    const candidate = text.indexOf(delimiter, start);
    if (candidate >= 0 && candidate < end) {
      end = candidate;
    }
  }
  const limitation = text.slice(start, end).trim();
  return limitation.includes(' ') ? limitation : undefined;
};

/** Extracts only explicit symptom statements; input contexts and notes are never modified. */
export function extractSymptomEvents(contexts: readonly DayContext[]): SymptomEvent[] {
  const events: SymptomEvent[] = [];

  for (const { date, notes } of contexts) {
    for (const sourceText of notes) {
      for (const match of sourceText.matchAll(/[^\n.!?;]+[.!?;]?/g)) {
        const statement = match[0].trim();
        const clauses = hasNegatedSymptom(statement) ? statement.split(/\bbut\b/i) : [statement];
        for (const clause of clauses) {
          const matchedText = clause.trim();
          if (!matchedText || hasNegatedSymptom(matchedText)) {
            continue;
          }

          const regionMatch = matchedText.match(REGION_PATTERN);
          const severityMatch = matchedText.match(SEVERITY_PATTERN);
          if (!SYMPTOM_PATTERN.test(matchedText) && !(regionMatch && severityMatch)) {
            continue;
          }

          const sideMatch = matchedText.match(/\b(left|right|bilateral|both)\b/i);
          const limitation = extractLimitation(matchedText);
          const exerciseMatch =
            matchedText.match(RELATED_EXERCISE_PATTERN) ?? limitation?.match(EXERCISE_PATTERN);
          const normalized = matchedText.toLowerCase();
          const timing = /\b(?:next|following)\s+(?:day|morning)\b/.test(normalized)
            ? 'next-day'
            : /\b(?:during|while)\s+(?:training|lifting|working out)\b/.test(normalized)
              ? 'during-training'
              : /\bafter\s+(?:training|lifting|working out)\b/.test(normalized)
                ? 'after-training'
                : undefined;

          events.push({
            date,
            sourceText,
            matchedText,
            ...(regionMatch && { region: REGIONS[regionMatch[1].toLowerCase()] }),
            ...(sideMatch && {
              side:
                sideMatch[1].toLowerCase() === 'both'
                  ? ('bilateral' as const)
                  : (sideMatch[1].toLowerCase() as SymptomSide),
            }),
            ...(severityMatch && { severityOutOf10: Number(severityMatch[1]) }),
            ...(limitation && { limitation }),
            ...(exerciseMatch && { relatedExercise: EXERCISES[exerciseMatch[1].toLowerCase()] }),
            ...(timing && { timing }),
          });
        }
      }
    }
  }

  return events;
}
