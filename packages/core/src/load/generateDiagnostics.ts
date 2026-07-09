import type {
  ConjugateDataPair,
  ConjugateExercise,
  DeadliftStancePreference,
  EffectEnum,
} from '../types/conjugate';
import type { RepCalcStats } from '../utils/stats/repCalculator';
import { resolveDeadliftStance } from '../utils/lifts/resolveDeadliftStance';

type ModifierEffectEntry =
  | { effects: EffectEnum[]; min: number; max: number }
  | { effects: EffectEnum[] };

export function generateDiagnostics(
  pairs: ConjugateDataPair[],
  anchorName: string,
  precomputed: RepCalcStats,
  deadliftStance: DeadliftStancePreference = 'sumo'
): ConjugateExercise[] {
  const results: ConjugateExercise[] = [];
  const variationExercises = new Map<string, ConjugateExercise>();

  for (const [ex] of pairs) {
    if (
      ex.displayName !== anchorName &&
      ex.type !== 'accessory' &&
      !variationExercises.has(ex.displayName)
    ) {
      variationExercises.set(ex.displayName, ex);
    }
  }

  for (const [name, ex] of variationExercises) {
    let addlWtOffset: number | undefined;
    if (ex.addlWts.length > 0) {
      const offsetEntry = precomputed.addlWtOffset.get(name);
      if (!offsetEntry || offsetEntry.sampleCount === 0) {
        continue;
      }
      addlWtOffset = offsetEntry.offset;
    }

    const factorEntry = precomputed.variantFactor.get(name);
    if (!factorEntry || factorEntry.sampleCount === 0) {
      continue;
    }
    const { factor } = factorEntry;

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
        return `stance:${resolveDeadliftStance(ex, deadliftStance)}:deadlift`;
      }
      if (ex.stance !== null && ex.stance !== 'competition') {
        return `stance:${ex.stance}:${ex.type}`;
      }
      return null;
    })();

    // Build magnitude-aware equipment key: try magnitude-specific key first (e.g. equipment:board-2:bench),
    // fall back to base key (e.g. equipment:board:bench) if no magnitude-specific entry exists.
    // NOTE (parity mirror, currently a no-op in practice): unlike @dyel/pipeline's parseExercise,
    // this package's parser (transform/parsers/nameToExercise.ts's parseEquipment) never extracts an
    // equipment magnitude from the raw exercise name, so `ex.equipmentMagnitude` is always undefined
    // here today and this always resolves to baseKey. This is a pre-existing legacy limitation, not
    // introduced by this change — wiring up magnitude parsing in core's own parser would be a broader
    // core refactor, out of scope for this parity-upkeep pass. Left in place so behavior is ready to
    // activate the moment (if ever) core's parser gains magnitude support, and so the key-construction
    // logic mirrors @dyel/pipeline's for anyone diffing the two implementations.
    const equipmentKey: string | null =
      ex.equipment !== null
        ? (() => {
            const magKey =
              ex.equipmentMagnitude && ex.equipmentMagnitude !== '1'
                ? `equipment:${ex.equipment}-${ex.equipmentMagnitude}:${ex.type}`
                : null;
            const baseKey = `equipment:${ex.equipment}:${ex.type}`;
            return magKey && __MODIFIER__EFFECTS__[magKey] ? magKey : baseKey;
          })()
        : null;

    const candidateKeys = [
      equipmentKey,
      resolvedStanceKey,
      ex.bar !== null && ex.bar !== 'standard' ? `bar:${ex.bar}:${ex.type}` : null,
    ].filter((k): k is string => k !== null);

    type PctEntry = Extract<ModifierEffectEntry, { min: number }>;
    const pctEntries = candidateKeys
      .map((k) => __MODIFIER__EFFECTS__[k])
      .filter((e): e is PctEntry => e !== undefined && 'min' in e);

    // addl_wt:* entries carry only effects, no pct range. After offset adjustment,
    // a chains/bands-only exercise is comparable to the straight bar, so use 100–100%
    // as the baseline. Exercises with no modifiers at all are still skipped.
    let baseline: { min: number; max: number };
    if (pctEntries.length === 0) {
      if (ex.addlWts.length === 0) {
        continue;
      }
      baseline = { min: 100, max: 100 };
    } else {
      baseline = pctEntries.reduce(
        (acc, e) => ({
          min: Math.round((acc.min * e.min) / 100),
          max: Math.round((acc.max * e.max) / 100),
        }),
        { min: 100, max: 100 }
      );
    }

    const expectedBaseline = `${baseline.min}–${baseline.max}%`;
    const averageIndex = factor * 100;

    // Aggregate effects from all active modifiers (bar + resolved stance + equipment + addlWts).
    const stanceForEffects: string | null =
      ex.type === 'deadlift' && (ex.stance === null || ex.stance === 'opposite')
        ? resolveDeadliftStance(ex, deadliftStance)
        : ex.stance;

    const allEffects = new Set<EffectEnum>();
    // Build magnitude-aware equipment key for effects gathering (same pattern as candidateKeys)
    const equipmentEffectKey: string | null =
      ex.equipment !== null
        ? (() => {
            const magKey =
              ex.equipmentMagnitude && ex.equipmentMagnitude !== '1'
                ? `equipment:${ex.equipment}-${ex.equipmentMagnitude}:${ex.type}`
                : null;
            const baseKey = `equipment:${ex.equipment}:${ex.type}`;
            return magKey && __MODIFIER__EFFECTS__[magKey] ? magKey : baseKey;
          })()
        : null;
    const effectKeys: Array<string | null> = [
      ex.bar !== null && ex.bar !== 'standard' ? `bar:${ex.bar}:${ex.type}` : null,
      stanceForEffects !== null && stanceForEffects !== 'competition'
        ? `stance:${stanceForEffects}:${ex.type}`
        : null,
      equipmentEffectKey,
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
    results.push({
      ...ex,
      averageIndex,
      expectedBaseline,
      status,
      diagnostic: `${name} at ${Math.round(averageIndex)}%`,
      effects: [...allEffects],
      addlWtOffset,
    });
  }
  return results;
}
