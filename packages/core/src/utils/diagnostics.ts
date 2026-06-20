// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../global.d.ts" />

import type {
  ConjugateDataPair,
  ConjugateExercise,
  DeadliftStancePreference,
  EffectEnum,
  MovementCategory,
  TrainingSession,
} from '../types/conjugate';
import { fitVariantFactor } from './e1rm';

type ExerciseShape = Pick<ConjugateExercise, 'type' | 'bar' | 'stance' | 'equipment'>;

type ModifierEffectEntry =
  | { effects: EffectEnum[]; min: number; max: number }
  | { effects: EffectEnum[] };

export interface DiagnosticsOptions {
  deadliftStance?: DeadliftStancePreference;
}

/**
 * Resolves a deadlift's effective stance to sumo vs. conventional from whether its movement
 * categories landed on the posterior chain. Shared by the pct-baseline lookup and the
 * effect-aggregation step so they can never disagree.
 */
function resolveDeadliftStance(effectiveCategory: MovementCategory[]): 'sumo' | 'conventional' {
  return effectiveCategory.includes('posterior_chain') ? 'sumo' : 'conventional';
}

function resolveCategory(ex: ConjugateExercise, options?: DiagnosticsOptions): MovementCategory[] {
  if (
    ex.type === 'deadlift' &&
    (ex.stance === 'sumo' || ex.stance === 'conventional' || ex.stance === 'opposite')
  ) {
    return toMovementCategory(ex, options);
  }
  return ex.movementCategory;
}

function isCompVariation(
  ex: ConjugateExercise,
  anchorName: string | null,
  effectiveCategories: MovementCategory[]
): boolean {
  if (anchorName) {
    return ex.displayName === anchorName;
  }
  if (
    ex.addlWts.length > 0 ||
    effectiveCategories.length != 1 ||
    ex.bar != 'standard' ||
    ex.equipment
  ) {
    return false;
  }
  return effectiveCategories[0] === 'anchor';
}

export function generateDiagnostics(
  pairs: ConjugateDataPair[],
  anchorName: string | null = null,
  options?: DiagnosticsOptions
): ConjugateExercise[] {
  const results: ConjugateExercise[] = [];
  const anchorSessions: TrainingSession[] = [];
  const variationGroups = new Map<string, { ex: ConjugateExercise; sessions: TrainingSession[] }>();

  for (const [ex, session] of pairs) {
    const effectiveCategory = resolveCategory(ex, options);
    // Accommodating resistance (bands/chains) changes the loading curve, so those
    // sessions are not comparable to straight-bar max and must not seed the anchor grid.
    const isAnchor = isCompVariation(ex, anchorName, effectiveCategory);
    if (isAnchor) {
      anchorSessions.push(session);
    } else if (!effectiveCategory.every((c) => c === 'unclassified')) {
      const key = ex.displayName;
      if (!variationGroups.has(key)) {
        variationGroups.set(key, { ex, sessions: [] });
      }
      variationGroups.get(key)!.sessions.push(session);
    }
  }

  for (const [name, { ex, sessions }] of variationGroups) {
    // Accommodating resistance makes e1RM comparison against the straight-bar anchor
    // unreliable (recorded weight excludes the variable chain/band load), so skip.
    if (ex.addlWts.length > 0) {
      continue;
    }
    const effectiveCategory = resolveCategory(ex, options);
    const { factor, sampleCount } = fitVariantFactor(anchorSessions, sessions);
    if (sampleCount === 0) {
      continue;
    }

    // Collect pct-bearing keys for all active modifiers. Multiple simultaneous
    // pct modifiers (e.g. SSB + pause squat) combine multiplicatively because
    // each independently scales performance relative to the competition lift.
    const resolvedStanceKey: string | null = (() => {
      if (
        ex.type === 'deadlift' &&
        (ex.stance === null ||
          ex.stance === 'sumo' ||
          ex.stance === 'conventional' ||
          ex.stance === 'opposite')
      ) {
        return `stance:${resolveDeadliftStance(effectiveCategory)}:deadlift`;
      }
      if (ex.stance !== null && ex.stance !== 'competition') {
        return `stance:${ex.stance}:${ex.type}`;
      }
      return null;
    })();

    const candidateKeys = [
      ex.equipment !== null ? `equipment:${ex.equipment}:${ex.type}` : null,
      resolvedStanceKey,
      ex.bar !== null && ex.bar !== 'standard' ? `bar:${ex.bar}:${ex.type}` : null,
    ].filter((k): k is string => k !== null);

    type PctEntry = Extract<ModifierEffectEntry, { min: number }>;
    const pctEntries = candidateKeys
      .map((k) => __MODIFIER__EFFECTS__[k])
      .filter((e): e is PctEntry => e !== undefined && 'min' in e);

    if (pctEntries.length === 0) {
      continue;
    }

    const baseline = pctEntries.reduce(
      (acc, e) => ({
        min: Math.round((acc.min * e.min) / 100),
        max: Math.round((acc.max * e.max) / 100),
      }),
      { min: 100, max: 100 }
    );
    const expectedBaseline = `${baseline.min}–${baseline.max}%`;
    const averageIndex = factor * 100;

    // Aggregate effects from all active modifiers (bar + resolved stance + equipment + addlWts).
    const stanceForEffects: string | null =
      ex.type === 'deadlift' && (ex.stance === null || ex.stance === 'opposite')
        ? resolveDeadliftStance(effectiveCategory)
        : ex.stance;

    const allEffects = new Set<EffectEnum>();
    const effectKeys: Array<string | null> = [
      ex.bar !== null && ex.bar !== 'standard' ? `bar:${ex.bar}:${ex.type}` : null,
      stanceForEffects !== null && stanceForEffects !== 'competition'
        ? `stance:${stanceForEffects}:${ex.type}`
        : null,
      ex.equipment !== null ? `equipment:${ex.equipment}:${ex.type}` : null,
      ...ex.addlWts.map((w) => `addl_wt:${w}:${ex.type}`),
    ];
    for (const k of effectKeys) {
      if (k !== null) {
        for (const e of __MODIFIER__EFFECTS__[k]?.effects ?? []) {
          allEffects.add(e);
        }
      }
    }

    const status =
      averageIndex < baseline.min
        ? 'weakness'
        : averageIndex > baseline.max
          ? 'overtrained'
          : 'optimal';
    ex.averageIndex = averageIndex;
    ex.expectedBaseline = expectedBaseline;
    ex.status = status;
    ex.diagnostic = `${name} at ${Math.round(averageIndex)}%`;
    ex.effects = [...allEffects];
    results.push(ex);
  }
  return results;
}

export function toMovementCategory(
  ex: ExerciseShape,
  options?: DiagnosticsOptions
): MovementCategory[] {
  if (ex.type === 'accessory') {
    return ['unclassified'];
  }

  const cats = new Set<MovementCategory>();

  if (ex.equipment !== null || ex.bar !== 'standard') {
    return ['xxx'];
  }
  if (ex.stance === 'competition') {
    return ['anchor'];
  }
  if (ex.type !== 'deadlift') {
    return ['xxx'];
  } else if (ex.type === 'deadlift') {
    if (ex.stance === 'romanian') {
      return ['xxx'];
    } else if (
      ex.stance === null ||
      ex.stance === 'sumo' ||
      ex.stance === 'conventional' ||
      ex.stance === 'opposite'
    ) {
      const primary = options?.deadliftStance ?? 'conventional';
      const nonPrimary = primary === 'conventional' ? 'sumo' : 'conventional';
      // Resolve to the actual stance: "opposite" = the non-primary stance; null = the primary stance.
      const actualStance: 'sumo' | 'conventional' =
        ex.stance === 'opposite' ? nonPrimary : ex.stance === null ? primary : ex.stance;
      // sumo = posterior chain (hip abductor/glute dominant)
      // conventional = quad dominant (leg drive, more knee extension at the start)
      cats.add(actualStance === 'sumo' ? 'posterior_chain' : 'quad_dominant');
    } else if (cats.size === 0) {
      cats.add('anchor');
    }
  }

  return cats.size > 0 ? [...cats] : ['unclassified'];
}
