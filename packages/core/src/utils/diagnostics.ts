// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../global.d.ts" />

import Papa from 'papaparse';
import type {
  ConjugateBar,
  ConjugateDataPair,
  ConjugateEquipment,
  ConjugateExercise,
  DeadliftStancePreference,
  DiagnosticResult,
  EffectEnum,
  MovementCategory,
  PrimaryLift,
  TrainingSession,
} from '../types/conjugate';
import { fitVariantFactor } from './e1rm';

type ExerciseShape = Pick<ConjugateExercise, 'type' | 'bar' | 'stance' | 'equipment'>;

const LOCKOUT_EQUIPMENT = new Set<ConjugateEquipment>(['board', 'floor', 'blocks', 'rack']);
const BOTTOM_RANGE_EQUIPMENT = new Set<ConjugateEquipment>(['deficit', 'pause']);
const QUAD_DOMINANT_BARS = new Set<ConjugateBar>(['ssb', 'goblet', 'trap', 'zercher', 'belt']);

type ModifierEffectEntry =
  | { effects: EffectEnum[]; min: number; max: number }
  | { effects: EffectEnum[] };

export type ModifierEffectsMap = Record<string, ModifierEffectEntry>;

interface ModifierEffectsRow {
  dimension: string;
  value: string;
  base_exercise: string;
  description: string;
  effects: string;
  'pct-low': string;
  'pct-high': string;
}

// Returns null when the CSV is missing the expected columns (wrong sheet tab, etc.),
// so callers can fall back to the hardcoded MODIFIER_EFFECTS instead of silently
// producing an empty map.
export function parseModifierEffectsCsv(csv: string): ModifierEffectsMap | null {
  const { data, meta } = Papa.parse<ModifierEffectsRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  });
  const required = ['dimension', 'value', 'base_exercise', 'pct-low', 'pct-high'];
  if (!required.every((col) => meta.fields?.includes(col))) {
    return null;
  }
  const map: ModifierEffectsMap = {};
  for (const row of data) {
    const key = `${row.dimension}:${row.value}:${row.base_exercise}`;
    const effects = row.effects
      ? (row.effects
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean) as EffectEnum[])
      : [];
    const pctLow = row['pct-low'];
    const pctHigh = row['pct-high'];
    if (pctLow && pctHigh) {
      map[key] = {
        effects,
        min: Math.round(parseFloat(pctLow) * 100),
        max: Math.round(parseFloat(pctHigh) * 100),
      };
    } else {
      map[key] = { effects };
    }
  }
  return map;
}

// When multiple pct-bearing modifiers are simultaneously active (e.g. SSB + pause squat),
// their ranges are combined multiplicatively: each modifier independently scales performance
// relative to the competition lift, so the effects compound. Start at 100% and multiply by
// each modifier's min and max in turn:
//   combined_min = round(m1_min × m2_min / 100)  (applied iteratively)
// addl_wt entries (chains, bands) carry no pct and are never included in the combination.
export const MODIFIER_EFFECTS: Record<string, ModifierEffectEntry> = {
  // bar × lift
  'bar:standard:squat': { effects: [], min: 100, max: 100 },
  'bar:standard:bench': { effects: [], min: 100, max: 100 },
  'bar:standard:deadlift': { effects: [], min: 100, max: 100 },
  'bar:ssb:squat': {
    effects: ['QUAD_DOMINANT', 'UPPER_BACK_DEMAND', 'SHOULDER_FRIENDLY', 'UPRIGHT_TORSO'],
    min: 90,
    max: 95,
  },
  'bar:trap:deadlift': {
    effects: ['QUAD_DOMINANT', 'UPRIGHT_TORSO', 'SPINE_DELOAD'],
    min: 105,
    max: 115,
  },
  'bar:american:bench': { effects: ['SHOULDER_FRIENDLY'], min: 95, max: 100 },
  'bar:swiss:bench': { effects: ['SHOULDER_FRIENDLY'], min: 90, max: 100 },
  'bar:cambered:squat': {
    effects: ['STABILIZER_DEMAND', 'UPPER_BACK_DEMAND', 'BOTTOM_RANGE'],
    min: 85,
    max: 95,
  },
  'bar:zercher:squat': {
    effects: ['CORE_DEMAND', 'UPPER_BACK_DEMAND', 'UPRIGHT_TORSO'],
    min: 70,
    max: 85,
  },
  'bar:duffalo:bench': { effects: ['SHOULDER_FRIENDLY'], min: 95, max: 100 },
  'bar:dumbbell:bench': { effects: ['UNILATERAL', 'STABILIZER_DEMAND'], min: 75, max: 90 },
  'bar:bamboo:bench': { effects: ['STABILIZER_DEMAND', 'BAR_SPEED'], min: 80, max: 90 },
  'bar:belt:squat': { effects: ['SPINE_DELOAD', 'QUAD_DOMINANT'], min: 85, max: 95 },
  'bar:goblet:squat': {
    effects: ['QUAD_DOMINANT', 'UPRIGHT_TORSO', 'CORE_DEMAND'],
    min: 50,
    max: 65,
  },

  // stance × lift
  'stance:competition:squat': { effects: [], min: 100, max: 100 },
  'stance:competition:bench': { effects: [], min: 100, max: 100 },
  'stance:competition:deadlift': { effects: [], min: 100, max: 100 },
  'stance:sumo:deadlift': {
    effects: ['HIP_DOMINANT', 'POSTERIOR_CHAIN', 'REDUCED_ROM'],
    min: 90,
    max: 100,
  },
  'stance:sumo:squat': { effects: ['HIP_DOMINANT', 'POSTERIOR_CHAIN'], min: 90, max: 100 },
  'stance:conventional:deadlift': {
    effects: ['HAMSTRING_DOMINANT', 'POSTERIOR_CHAIN'],
    min: 90,
    max: 100,
  },
  'stance:close:bench': { effects: ['TRICEP_DOMINANT'], min: 80, max: 90 },
  'stance:close:squat': { effects: ['QUAD_DOMINANT'], min: 85, max: 95 },
  'stance:wide:bench': { effects: ['UPPER_PECS', 'REDUCED_ROM'], min: 90, max: 100 },
  'stance:wide:squat': { effects: ['POSTERIOR_CHAIN'], min: 90, max: 100 },
  'stance:medium:bench': { effects: [], min: 100, max: 100 },
  'stance:medium:squat': { effects: [], min: 100, max: 100 },
  'stance:narrow:bench': { effects: ['TRICEP_DOMINANT'], min: 85, max: 95 },
  'stance:narrow:squat': { effects: ['QUAD_DOMINANT'], min: 85, max: 95 },
  'stance:romanian:deadlift': { effects: ['HAMSTRING_DOMINANT', 'BOTTOM_RANGE'], min: 60, max: 75 },
  'stance:front:squat': {
    effects: ['QUAD_DOMINANT', 'UPRIGHT_TORSO', 'CORE_DEMAND'],
    min: 75,
    max: 85,
  },
  'stance:slingshot:bench': { effects: ['SUPRAMAXIMAL', 'LOCKOUT'], min: 110, max: 120 },
  'stance:builder:bench': { effects: ['BOTTOM_RANGE', 'SUPRAMAXIMAL'], min: 105, max: 115 },
  'stance:opposite:deadlift': { effects: [], min: 100, max: 100 },

  // equipment × lift
  'equipment:incline:bench': { effects: ['UPPER_PECS'], min: 85, max: 95 },
  'equipment:decline:bench': { effects: ['LOWER_PECS'], min: 100, max: 110 },
  'equipment:blocks:deadlift': { effects: ['REDUCED_ROM', 'LOCKOUT'], min: 105, max: 115 },
  'equipment:deficit:deadlift': { effects: ['EXTENDED_ROM', 'BOTTOM_RANGE'], min: 85, max: 95 },
  'equipment:board:bench': {
    effects: ['REDUCED_ROM', 'LOCKOUT', 'SUPRAMAXIMAL'],
    min: 105,
    max: 115,
  },
  'equipment:pause:squat': { effects: ['DEAD_STOP'], min: 85, max: 95 },
  'equipment:pause:bench': { effects: ['DEAD_STOP'], min: 85, max: 95 },
  'equipment:pause:deadlift': { effects: ['DEAD_STOP'], min: 90, max: 95 },
  'equipment:floor:bench': {
    effects: ['REDUCED_ROM', 'LOCKOUT', 'NO_LEG_DRIVE', 'TRICEP_DOMINANT'],
    min: 85,
    max: 95,
  },
  'equipment:box:squat': { effects: ['DEAD_STOP', 'POSTERIOR_SHIFT'], min: 90, max: 100 },
  'equipment:rack:deadlift': { effects: ['REDUCED_ROM', 'LOCKOUT'], min: 110, max: 130 },

  // addl_wt × lift (no pct — accommodating resistance has no percentage baselines)
  'addl_wt:chains:squat': {
    effects: ['ACCOMMODATING_RESISTANCE', 'BAR_SPEED', 'STABILIZER_DEMAND'],
  },
  'addl_wt:chains:bench': {
    effects: ['ACCOMMODATING_RESISTANCE', 'BAR_SPEED', 'STABILIZER_DEMAND'],
  },
  'addl_wt:chains:deadlift': {
    effects: ['ACCOMMODATING_RESISTANCE', 'BAR_SPEED', 'STABILIZER_DEMAND'],
  },
  'addl_wt:bands:squat': { effects: ['ACCOMMODATING_RESISTANCE', 'BAR_SPEED'] },
  'addl_wt:bands:bench': { effects: ['ACCOMMODATING_RESISTANCE', 'BAR_SPEED'] },
  'addl_wt:bands:deadlift': { effects: ['ACCOMMODATING_RESISTANCE', 'BAR_SPEED'] },
  'addl_wt:rev. bands:squat': { effects: ['SUPRAMAXIMAL', 'LOCKOUT'] },
  'addl_wt:rev. bands:bench': { effects: ['SUPRAMAXIMAL', 'LOCKOUT'] },
  'addl_wt:rev. bands:deadlift': { effects: ['SUPRAMAXIMAL', 'LOCKOUT'] },
};

export interface DiagnosticsOptions {
  deadliftStance?: DeadliftStancePreference;
  modifierEffects?: ModifierEffectsMap;
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

export function generateDiagnostics(
  pairs: ConjugateDataPair[],
  options?: DiagnosticsOptions
): DiagnosticResult[] {
  const effectsMap = options?.modifierEffects ?? MODIFIER_EFFECTS;
  const byLift = new Map<PrimaryLift, ConjugateDataPair[]>();
  for (const pair of pairs) {
    const [ex] = pair;
    if (ex.type === 'accessory') {
      continue;
    }
    const lift = ex.type as PrimaryLift;
    if (!byLift.has(lift)) {
      byLift.set(lift, []);
    }
    byLift.get(lift)!.push(pair);
  }

  const results: DiagnosticResult[] = [];

  for (const [lift, liftPairs] of byLift) {
    const anchorSessions: TrainingSession[] = [];
    const variationGroups = new Map<
      string,
      { ex: ConjugateExercise; sessions: TrainingSession[] }
    >();

    // For bench, prefer w/commands (equipment: "pause", standard bar, competition stance, no
    // addlWts) as the anchor when present. Competition bench is always performed to judge's
    // commands, so this IS the competition lift.
    const commandsBenchName =
      lift === 'bench'
        ? (liftPairs.find(
            ([ex]) =>
              ex.bar === 'standard' &&
              ex.stance === 'competition' &&
              ex.equipment === 'pause' &&
              ex.addlWts.length === 0
          )?.[0].displayName ?? null)
        : null;

    for (const [ex, session] of liftPairs) {
      const effectiveCategory = resolveCategory(ex, options);
      // Accommodating resistance (bands/chains) changes the loading curve, so those
      // sessions are not comparable to straight-bar max and must not seed the anchor grid.
      const isAnchor =
        commandsBenchName !== null
          ? ex.displayName === commandsBenchName
          : effectiveCategory.length === 1 &&
            effectiveCategory[0] === 'anchor' &&
            ex.addlWts.length === 0;
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
        .map((k) => effectsMap[k])
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
      results.push({
        primaryLift: lift,
        name,
        averageIndex,
        expectedBaseline,
        status,
        diagnostic: `${name} at ${Math.round(averageIndex)}%`,
        effects: [...allEffects],
      });
    }
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

  // ROM modifier dimension: captures where in the lift's range the exercise emphasizes work.
  // These are independent of the underlying movement pattern and can combine with it.
  if (ex.equipment !== null && LOCKOUT_EQUIPMENT.has(ex.equipment)) {
    cats.add('lockout');
  }
  if (
    ex.stance === 'close' ||
    ex.stance === 'slingshot' ||
    ex.stance === 'builder' ||
    ex.stance === 'narrow'
  ) {
    cats.add('lockout');
  }
  if (ex.equipment !== null && BOTTOM_RANGE_EQUIPMENT.has(ex.equipment)) {
    cats.add('bottom_range');
  }
  if (ex.type === 'squat' && ex.bar === 'cambered') {
    cats.add('bottom_range');
  }
  if (ex.type === 'squat' && ex.equipment === 'box') {
    cats.add('bottom_range');
  }

  // Movement pattern dimension: captures the muscular emphasis determined by stance, bar, and type.
  // "anchor" is only added when no ROM modifier is present — competition stance is the parser
  // fallback, so it shouldn't override equipment-based classification.
  if (ex.type === 'squat') {
    if (ex.stance === 'sumo' || ex.stance === 'wide') {
      cats.add('posterior_chain');
    } else if ((ex.bar !== null && QUAD_DOMINANT_BARS.has(ex.bar)) || ex.stance === 'front') {
      cats.add('quad_dominant');
    } else if (ex.stance === 'competition' && cats.size === 0) {
      cats.add('anchor');
    }
  } else if (ex.type === 'bench') {
    if (ex.stance === 'competition' && cats.size === 0) {
      cats.add('anchor');
    }
  } else if (ex.type === 'deadlift') {
    if (ex.stance === 'romanian') {
      cats.add('posterior_chain');
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
    } else if (ex.stance === 'competition' && cats.size === 0) {
      cats.add('anchor');
    }
  }

  return cats.size > 0 ? [...cats] : ['unclassified'];
}
