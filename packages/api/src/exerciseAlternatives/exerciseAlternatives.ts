export type ExerciseAlias = string;
export type ExerciseIssueCategory =
  | 'grip-handle'
  | 'loading-range'
  | 'stance-spacing'
  | 'range-of-motion'
  | 'equipment-unavailable'
  | 'setup-unstable-difficult'
  | 'grip-uncomfortable'
  | 'movement-uncomfortable';
export type ExerciseIssueDirection =
  | 'too-small'
  | 'too-large'
  | 'starting-resistance-too-heavy'
  | 'maximum-resistance-too-light'
  | 'too-narrow'
  | 'too-wide'
  | 'too-short'
  | 'too-long';
export type ExerciseIssueId =
  | `grip-handle:${'too-small' | 'too-large'}`
  | `loading-range:${'starting-resistance-too-heavy' | 'maximum-resistance-too-light'}`
  | `stance-spacing:${'too-narrow' | 'too-wide'}`
  | `range-of-motion:${'too-short' | 'too-long'}`
  | 'equipment-unavailable'
  | 'setup-unstable-difficult'
  | 'grip-uncomfortable'
  | 'movement-uncomfortable';
export type ExerciseRecommendationKind = 'adjustment' | 'replacement';

export interface ExerciseIssueChoice {
  id: ExerciseIssueId;
  category: ExerciseIssueCategory;
  direction?: ExerciseIssueDirection;
  label: string;
}

export interface ExerciseRecommendationExplanation {
  whyItHelps: string;
  staysSimilar: string;
  changes: string;
}

export interface ExerciseRecommendation extends ExerciseRecommendationExplanation {
  id: string;
  kind: ExerciseRecommendationKind;
  title: string;
  exerciseId?: string;
}

export interface ExerciseAlternative {
  id: string;
  name: string;
  aliases: readonly ExerciseAlias[];
  recommendations: Readonly<Partial<Record<ExerciseIssueId, readonly ExerciseRecommendation[]>>>;
}

export const EXERCISE_ALTERNATIVE_ISSUES = [
  {
    id: 'grip-handle:too-small',
    category: 'grip-handle',
    direction: 'too-small',
    label: 'Grip or handle is too small',
  },
  {
    id: 'grip-handle:too-large',
    category: 'grip-handle',
    direction: 'too-large',
    label: 'Grip or handle is too large',
  },
  {
    id: 'loading-range:starting-resistance-too-heavy',
    category: 'loading-range',
    direction: 'starting-resistance-too-heavy',
    label: 'Starting resistance is too heavy',
  },
  {
    id: 'loading-range:maximum-resistance-too-light',
    category: 'loading-range',
    direction: 'maximum-resistance-too-light',
    label: 'Maximum resistance is too light',
  },
  {
    id: 'stance-spacing:too-narrow',
    category: 'stance-spacing',
    direction: 'too-narrow',
    label: 'Stance or spacing is too narrow',
  },
  {
    id: 'stance-spacing:too-wide',
    category: 'stance-spacing',
    direction: 'too-wide',
    label: 'Stance or spacing is too wide',
  },
  {
    id: 'range-of-motion:too-short',
    category: 'range-of-motion',
    direction: 'too-short',
    label: 'Range of motion is too short',
  },
  {
    id: 'range-of-motion:too-long',
    category: 'range-of-motion',
    direction: 'too-long',
    label: 'Range of motion is too long',
  },
  {
    id: 'equipment-unavailable',
    category: 'equipment-unavailable',
    label: 'Equipment unavailable',
  },
  {
    id: 'setup-unstable-difficult',
    category: 'setup-unstable-difficult',
    label: 'Setup is unstable or difficult',
  },
  { id: 'grip-uncomfortable', category: 'grip-uncomfortable', label: 'Grip is uncomfortable' },
  {
    id: 'movement-uncomfortable',
    category: 'movement-uncomfortable',
    label: 'Movement is uncomfortable',
  },
] as const satisfies readonly ExerciseIssueChoice[];

export const EXERCISE_ALTERNATIVES_CATALOG: readonly ExerciseAlternative[] = [
  {
    id: 'swiss-bar-bench-press',
    name: 'Swiss-Bar Bench Press',
    aliases: ['football bar bench'],
    recommendations: {
      'grip-handle:too-small': [
        {
          id: 'swiss-wider',
          kind: 'adjustment',
          title: 'Use a wider handle pair',
          whyItHelps: 'Provides a wider hand placement without changing implements.',
          staysSimilar: 'Keeps the Swiss bar, neutral grip, bench, and loading method.',
          changes: 'Arm angle and pressing emphasis shift slightly.',
        },
        {
          id: 'swiss-dumbbell',
          kind: 'replacement',
          title: 'Dumbbell Bench Press',
          whyItHelps: 'Allows each hand to choose a flexible width and path.',
          staysSimilar: 'Keeps a horizontal free-weight press.',
          changes: 'Requires more independent stabilization and separate implements.',
        },
      ],
    },
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    aliases: ['pushup', 'press-up'],
    recommendations: {
      'loading-range:maximum-resistance-too-light': [
        {
          id: 'push-band',
          kind: 'adjustment',
          title: 'Band-Resisted Push-Up',
          whyItHelps: 'Adds load, with band tension increasing toward lockout.',
          staysSimilar: 'Keeps the push-up body position and hand support.',
          changes: 'Adds accommodating resistance that is lightest near the bottom.',
        },
      ],
    },
  },
];

const byName = new Map<string, ExerciseAlternative>();
for (const exercise of EXERCISE_ALTERNATIVES_CATALOG) {
  byName.set(exercise.name.toLocaleLowerCase(), exercise);
  for (const alias of exercise.aliases) {
    byName.set(alias.toLocaleLowerCase(), exercise);
  }
}

export const listSearchableExerciseNames = (): string[] => {
  const names: string[] = [];
  for (const exercise of EXERCISE_ALTERNATIVES_CATALOG) {
    names.push(exercise.name, ...exercise.aliases);
  }
  return names;
};

export const resolveAlternativeExercise = (name: string): ExerciseAlternative | null =>
  byName.get(name.trim().toLocaleLowerCase()) ?? null;

export const getSupportedExerciseIssues = (exerciseName: string): ExerciseIssueChoice[] => {
  const exercise = resolveAlternativeExercise(exerciseName);
  if (!exercise) {
    return [];
  }
  const choices: ExerciseIssueChoice[] = [];
  for (const issue of EXERCISE_ALTERNATIVE_ISSUES) {
    if (exercise.recommendations[issue.id]?.length) {
      choices.push(issue);
    }
  }
  return choices;
};

export const getExerciseRecommendations = (
  exerciseName: string,
  issueId: ExerciseIssueId
): ExerciseRecommendation[] => {
  const recommendations = resolveAlternativeExercise(exerciseName)?.recommendations[issueId];
  if (!recommendations) {
    return [];
  }
  const adjustments: ExerciseRecommendation[] = [];
  const replacements: ExerciseRecommendation[] = [];
  for (const recommendation of recommendations) {
    (recommendation.kind === 'adjustment' ? adjustments : replacements).push(recommendation);
  }
  return [...adjustments, ...replacements];
};
