import type {
  ConjugateBar,
  ConjugateDataPair,
  ConjugateEquipment,
  ConjugateExercise,
  DeadliftStancePreference,
  DiagnosticResult,
  MovementCategory,
  PrimaryLift,
  TrainingSession,
} from "../types/conjugate";
import { fitVariantFactor } from "./e1rm";

type ExerciseShape = Pick<ConjugateExercise, "type" | "bar" | "stance" | "equipment">;

const LOCKOUT_EQUIPMENT = new Set<ConjugateEquipment>(["board", "floor", "blocks", "rack"]);
const BOTTOM_RANGE_EQUIPMENT = new Set<ConjugateEquipment>(["deficit", "pause"]);
const QUAD_DOMINANT_BARS = new Set<ConjugateBar>(["ssb", "goblet", "trap"]);

type BaselineEntry = {
  min: number;
  max: number;
  equipmentOverrides?: Partial<Record<ConjugateEquipment, { min: number; max: number }>>;
};

export const BIOMECHANICAL_BASELINES: Record<
  PrimaryLift,
  Partial<Record<MovementCategory, BaselineEntry>>
> = {
  bench: {
    lockout: { min: 90, max: 95, equipmentOverrides: { floor: { min: 85, max: 90 } } },
    bottom_range: { min: 90, max: 95 },
  },
  squat: {
    bottom_range: { min: 85, max: 92 },
    quad_dominant: { min: 80, max: 85 },
  },
  deadlift: {
    bottom_range: { min: 85, max: 90 },
    lockout: { min: 90, max: 95 },
    quad_dominant: { min: 88, max: 97 },
  },
};

export const ACCOMMODATING_RESISTANCE_BASELINES: Record<string, { range: string; floor: number }> =
  {};

export type DiagnosticsOptions = { deadliftStance?: DeadliftStancePreference };

function resolveCategory(ex: ConjugateExercise, options?: DiagnosticsOptions): MovementCategory {
  if (
    ex.type === "deadlift" &&
    (ex.stance === "sumo" || ex.stance === "conventional" || ex.stance === "opposite")
  ) {
    return toMovementCategory(ex, options);
  }
  return ex.movementCategory;
}

export function generateDiagnostics(
  pairs: ConjugateDataPair[],
  options?: DiagnosticsOptions
): DiagnosticResult[] {
  const byLift = new Map<PrimaryLift, ConjugateDataPair[]>();
  for (const pair of pairs) {
    const [ex] = pair;
    if (ex.type === "accessory") continue;
    const lift = ex.type as PrimaryLift;
    if (!byLift.has(lift)) byLift.set(lift, []);
    byLift.get(lift)!.push(pair);
  }

  const results: DiagnosticResult[] = [];

  for (const [lift, liftPairs] of byLift) {
    const anchorSessions: TrainingSession[] = [];
    const variationGroups = new Map<
      string,
      { ex: ConjugateExercise; sessions: TrainingSession[] }
    >();

    for (const [ex, session] of liftPairs) {
      const effectiveCategory = resolveCategory(ex, options);
      if (effectiveCategory === "anchor") {
        anchorSessions.push(session);
      } else if (effectiveCategory !== "unclassified") {
        const key = ex.displayName;
        if (!variationGroups.has(key)) variationGroups.set(key, { ex, sessions: [] });
        variationGroups.get(key)!.sessions.push(session);
      }
    }

    for (const [name, { ex, sessions }] of variationGroups) {
      const effectiveCategory = resolveCategory(ex, options);
      const { factor, sampleCount } = fitVariantFactor(anchorSessions, sessions);
      if (sampleCount === 0) continue;

      const averageIndex = factor * 100;

      let baseline: { min: number; max: number } | null = null;
      let expectedBaseline: string;
      const arEntry = ACCOMMODATING_RESISTANCE_BASELINES[name];
      if (arEntry) {
        baseline = { min: arEntry.floor, max: arEntry.floor };
        expectedBaseline = arEntry.range;
      } else {
        const catEntry = BIOMECHANICAL_BASELINES[lift][effectiveCategory];
        if (catEntry) {
          const override = ex.equipment ? catEntry.equipmentOverrides?.[ex.equipment] : undefined;
          baseline = override ?? { min: catEntry.min, max: catEntry.max };
        }
        if (!baseline) continue;
        expectedBaseline = `${baseline.min}–${baseline.max}%`;
      }

      const tag = averageIndex >= baseline.min ? "Optimal" : "Weakness";
      results.push({
        primaryLift: lift,
        name,
        category: effectiveCategory,
        averageIndex,
        expectedBaseline,
        diagnostic: `${tag}: ${name} at ${Math.round(averageIndex)}%`,
      });
    }
  }

  return results;
}

export function toMovementCategory(
  ex: ExerciseShape,
  options?: DiagnosticsOptions
): MovementCategory {
  if (ex.type === "accessory") return "unclassified";
  if (ex.stance === "competition") return "anchor";
  if ((ex.equipment !== null && LOCKOUT_EQUIPMENT.has(ex.equipment)) || ex.stance === "close")
    return "lockout";
  if (ex.equipment !== null && BOTTOM_RANGE_EQUIPMENT.has(ex.equipment)) return "bottom_range";
  if (
    ex.type === "squat" &&
    ((ex.bar !== null && QUAD_DOMINANT_BARS.has(ex.bar)) || ex.stance === "front")
  )
    return "quad_dominant";
  if (ex.type === "deadlift" && ex.stance === "romanian") return "posterior_chain";
  if (ex.type === "squat" && ex.equipment === "box") return "bottom_range";
  if (ex.stance === "slingshot" || ex.stance === "builder") return "lockout";
  if (ex.stance === "narrow") return "lockout";
  if (ex.type === "bench" && (ex.equipment === "incline" || ex.equipment === "decline"))
    return "lockout";
  if (
    ex.type === "deadlift" &&
    (ex.stance === "sumo" || ex.stance === "conventional" || ex.stance === "opposite")
  ) {
    const primary = options?.deadliftStance ?? "conventional";
    // sumo stance and "opposite" are the non-conventional side of the deadlift.
    // With conventional primary: non-conventional → posterior_chain, conventional → quad_dominant.
    // Toggling to sumo primary swaps all three labels.
    const isNonConventionalStance = ex.stance === "sumo" || ex.stance === "opposite";
    if (primary === "conventional") {
      return isNonConventionalStance ? "posterior_chain" : "quad_dominant";
    } else {
      return isNonConventionalStance ? "quad_dominant" : "posterior_chain";
    }
  }
  return "unclassified";
}
