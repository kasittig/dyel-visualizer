import { useState } from 'react';
import {
  getExerciseRecommendations,
  getExerciseFamily,
  getSupportedExerciseIssues,
  listSearchableExerciseNames,
  resolveAlternativeExercise,
  type ExerciseIssueCategory,
  type ExerciseIssueChoice,
  type ExerciseIssueId,
  type ExerciseRecommendation,
} from '@dyel/api';

const CATEGORY_LABELS: Record<ExerciseIssueCategory, string> = {
  'grip-handle': 'Grip or handle',
  'loading-range': 'Loading range',
  'stance-spacing': 'Stance or spacing',
  'range-of-motion': 'Range of motion',
  'equipment-unavailable': 'Equipment unavailable',
  'setup-unstable-difficult': 'Setup or stability',
  'grip-uncomfortable': 'Grip comfort',
  'movement-uncomfortable': 'Movement comfort',
  'avoid-spinal-loading': 'Spinal loading',
};

const DIRECTION_LABELS: Partial<Record<ExerciseIssueId, string>> = {
  'grip-handle:too-small': 'Grip feels too small',
  'grip-handle:too-large': 'Grip feels too large',
  'loading-range:starting-resistance-too-heavy': 'Starting resistance is too heavy',
  'loading-range:maximum-resistance-too-light': 'I cannot add enough resistance',
  'stance-spacing:too-narrow': 'Stance feels too narrow',
  'stance-spacing:too-wide': 'Stance feels too wide',
  'range-of-motion:too-short': 'Range of motion feels too short',
  'range-of-motion:too-long': 'Range of motion feels too long',
};

const exerciseSearchText = new Map<string, string>();
for (const searchableName of listSearchableExerciseNames()) {
  const canonicalName = resolveAlternativeExercise(searchableName)?.name;
  if (canonicalName) {
    exerciseSearchText.set(
      canonicalName,
      `${exerciseSearchText.get(canonicalName) ?? canonicalName} ${searchableName}`
    );
  }
}

const FAMILY_LABELS = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift' } as const;
const exerciseNamesByFamily = Map.groupBy([...exerciseSearchText.keys()], (exercise) =>
  getExerciseFamily(exercise)
);
const exerciseOptions = [
  ...(exerciseNamesByFamily.get('squat') ?? []),
  ...(exerciseNamesByFamily.get('bench') ?? []),
  ...(exerciseNamesByFamily.get('deadlift') ?? []),
];

export interface ExerciseAlternativeChoice<T extends string> {
  value: T;
  label: string;
}

export interface ExerciseAlternativeResults {
  adjustments: ExerciseRecommendation[];
  replacements: ExerciseRecommendation[];
}

export function useExerciseAlternatives() {
  const [exerciseName, setExerciseName] = useState<string | null>(null);
  const [category, setCategory] = useState<ExerciseIssueCategory | null>(null);
  const [issueId, setIssueId] = useState<ExerciseIssueId | null>(null);

  const supportedIssues = exerciseName ? getSupportedExerciseIssues(exerciseName) : [];
  const categoryOptions: ExerciseAlternativeChoice<ExerciseIssueCategory>[] = [];
  const seenCategories = new Set<ExerciseIssueCategory>();
  for (const issue of supportedIssues) {
    if (!seenCategories.has(issue.category)) {
      seenCategories.add(issue.category);
      categoryOptions.push({ value: issue.category, label: CATEGORY_LABELS[issue.category] });
    }
  }

  const directionOptions: ExerciseAlternativeChoice<ExerciseIssueId>[] = [];
  if (category) {
    for (const issue of supportedIssues) {
      if (issue.category === category && issue.direction) {
        directionOptions.push({
          value: issue.id,
          label: DIRECTION_LABELS[issue.id] ?? issue.label,
        });
      }
    }
  }

  const recommendations =
    exerciseName && issueId ? getExerciseRecommendations(exerciseName, issueId) : [];
  const results: ExerciseAlternativeResults = { adjustments: [], replacements: [] };
  for (const recommendation of recommendations) {
    (recommendation.kind === 'adjustment' ? results.adjustments : results.replacements).push(
      recommendation
    );
  }

  const selectExercise = (searchName: string) => {
    setExerciseName(resolveAlternativeExercise(searchName)?.name ?? null);
    setCategory(null);
    setIssueId(null);
  };

  const selectCategory = (nextCategory: ExerciseIssueCategory) => {
    setCategory(nextCategory);
    const matchingIssues: ExerciseIssueChoice[] = [];
    for (const issue of supportedIssues) {
      if (issue.category === nextCategory) {
        matchingIssues.push(issue);
      }
    }
    setIssueId(
      matchingIssues.length === 1 && !matchingIssues[0].direction ? matchingIssues[0].id : null
    );
  };

  const reset = () => {
    setExerciseName(null);
    setCategory(null);
    setIssueId(null);
  };

  return {
    exerciseOptions,
    getExerciseSearchText: (exercise: string) => exerciseSearchText.get(exercise) ?? exercise,
    getExerciseGroupLabel: (exercise: string) => {
      const family = getExerciseFamily(exercise);
      return family ? FAMILY_LABELS[family] : null;
    },
    exerciseName,
    category,
    issueId,
    categoryOptions,
    directionOptions,
    results,
    hasRecommendations: recommendations.length > 0,
    selectExercise,
    selectCategory,
    selectDirection: setIssueId,
    reset,
  };
}
