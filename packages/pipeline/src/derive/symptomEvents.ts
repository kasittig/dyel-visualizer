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
const NEGATED_SYMPTOM_PATTERN =
  /\b(?:no|not|never|without)\s+(?:\w+\s+){0,2}(?:ache[ds]?|aching|discomfort|hurt(?:ing|s)?|pain(?:ful)?|sore(?:ness)?|stiff(?:ness)?|tender(?:ness)?|tight(?:ness)?)\b/i;
const SEVERITY_PATTERN = /\b(10|[0-9])\s*\/\s*10\b/;
const LIMITATION_PATTERN =
  /\b(?:(?:could(?:n't| not)|unable to|had to|stopped|cut)\s+[^,.;!?]+|limited\s+(?:my\s+)?[^,.;!?]+)\b/i;

/** Extracts only explicit symptom statements; input contexts and notes are never modified. */
export function extractSymptomEvents(contexts: readonly DayContext[]): SymptomEvent[] {
  const events: SymptomEvent[] = [];

  for (const { date, notes } of contexts) {
    for (const sourceText of notes) {
      for (const match of sourceText.matchAll(/[^\n.!?;]+[.!?;]?/g)) {
        const matchedText = match[0].trim();
        if (!matchedText || NEGATED_SYMPTOM_PATTERN.test(matchedText)) {
          continue;
        }

        const regionMatch = matchedText.match(REGION_PATTERN);
        const severityMatch = matchedText.match(SEVERITY_PATTERN);
        if (!SYMPTOM_PATTERN.test(matchedText) && !(regionMatch && severityMatch)) {
          continue;
        }

        const sideMatch = matchedText.match(/\b(left|right|bilateral|both)\b/i);
        const limitationMatch = matchedText.match(LIMITATION_PATTERN);
        const exerciseMatch =
          matchedText.match(RELATED_EXERCISE_PATTERN) ??
          limitationMatch?.[0].match(EXERCISE_PATTERN);
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
          ...(limitationMatch && { limitation: limitationMatch[0] }),
          ...(exerciseMatch && { relatedExercise: EXERCISES[exerciseMatch[1].toLowerCase()] }),
          ...(timing && { timing }),
        });
      }
    }
  }

  return events;
}
